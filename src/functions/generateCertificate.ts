import { APIGatewayProxyHandler } from 'aws-lambda';
import { document } from '../utils/dynamodbClient';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { compile } from 'handlebars';
import dayjs from 'dayjs';
import { join } from 'path';
import { readFileSync } from 'fs';
import chromium from 'chrome-aws-lambda';

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
    region: process.env.AWS_REGION || 'us-east-1',
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
  const { id, name, grade } = JSON.parse(event.body) as ICreateCertificate;

  const response = await document.send(new QueryCommand({
    TableName: 'users_certificate',
    KeyConditionExpression: 'id = :id',
    ExpressionAttributeValues: {
      ':id': id,
    },
  }));

  const userAlreadyExists = response.Items?.[0];

  if (!userAlreadyExists) {
    await document.send(new PutCommand({
      TableName: 'users_certificate',
      Item: {
        id,
        name,
        grade,
        created_at: new Date().getTime(),
      },
    }));
  }

  const medalPath = join(process.cwd(), 'src', 'templates', 'stamp.png');
  const medal = readFileSync(medalPath, 'base64');

  const data: ITemplate = {
    name,
    id,
    grade,
    date: dayjs().format('DD/MM/YYYY'),
    medal,
  };

  const content = await compileTemplate(data);

  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
  });

  const page = await browser.newPage();

  await page.setContent(content);
  const pdf = await page.pdf({
    format: 'a4',
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
    path: process.env.IS_OFFLINE ? './certificate.pdf' : null,
  });

  await browser.close();

  const s3 = createS3Client();

  await s3.send(new PutObjectCommand({
    Bucket: 'certificadoignite2021',
    Key: `${id}.pdf`,
    Body: pdf,
    ContentType: 'application/pdf',
  }));

  return {
    statusCode: 201,
    body: JSON.stringify({
      message: 'Certificado criado com sucesso',
      url: `https://certificadoignite2021.s3.amazonaws.com/${id}.pdf`,
    }),
  };
};
