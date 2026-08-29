import { APIGatewayProxyHandler } from 'aws-lambda';
import { document } from '../utils/dynamodbClient';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { compile } from 'handlebars';
import dayjs from 'dayjs';
import { join } from 'path';
import { readFileSync } from 'fs';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

interface ICreateCertificate {
  id: string;
  name: string;
  grade: string;
}

interface ITemplate {
  id: string;
  name: string;
  grade: string;
  medal: string;
  date: string;
}

const compileTemplate = async (data: ITemplate) => {
  const filePath = join(process.cwd(), 'src', 'templates', 'certificate.hbs');

  const html = readFileSync(filePath, 'utf8');

  return compile(html)(data);
};

const createS3Client = () => {
  const isOffline = process.env.IS_OFFLINE;
  const endpoint = process.env.S3_ENDPOINT || 'http://localhost:4566';

  return new S3Client({
    region: process.env.AWS_REGION || 'eu-west-1',
    ...(isOffline && {
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    }),
  });
};

export const handler: APIGatewayProxyHandler = async (event) => {
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Request body is required',
      }),
    };
  }

  let parsed: ICreateCertificate;
  try {
    parsed = JSON.parse(event.body) as ICreateCertificate;
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid JSON in request body' }),
    };
  }

  const { id, name, grade } = parsed;

  if (!id || !name || !grade) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'id, name and grade are required' }),
    };
  }

  const response = await document.send(
    new QueryCommand({
      TableName: 'users_certificate',
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': id,
      },
    }),
  );

  const userAlreadyExists = response.Items?.[0] as ICreateCertificate | undefined;

  if (!userAlreadyExists) {
    await document.send(
      new PutCommand({
        TableName: 'users_certificate',
        Item: {
          id,
          name,
          grade,
          created_at: new Date().getTime(),
        },
      }),
    );
  }

  const medalPath = join(process.cwd(), 'src', 'templates', 'stamp.png');
  const medal = readFileSync(medalPath, 'base64');

  // Use the stored record when the user already exists to keep the certificate consistent
  const certName = userAlreadyExists?.name ?? name;
  const certGrade = userAlreadyExists?.grade ?? grade;

  const data: ITemplate = {
    id,
    name: certName,
    grade: certGrade,
    date: dayjs().format('DD/MM/YYYY'),
    medal,
  };

  const content = await compileTemplate(data);

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1920, height: 1080 },
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  let pdf!: Buffer;
  try {
    const page = await browser.newPage();
    await page.setContent(content);
    const pdfBytes = await page.pdf({
      format: 'a4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      path: process.env.IS_OFFLINE ? './certificate.pdf' : undefined,
    });
    pdf = Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }

  const bucket = process.env.S3_BUCKET_NAME ?? 'certificadoignite2021';
  const s3 = createS3Client();

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `${id}.pdf`,
      Body: pdf,
      ContentType: 'application/pdf',
    }),
  );

  return {
    statusCode: 201,
    body: JSON.stringify({
      message: 'Certificate created successfully',
      url: `https://${bucket}.s3.amazonaws.com/${id}.pdf`,
    }),
  };
};
