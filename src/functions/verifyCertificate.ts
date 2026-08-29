import { APIGatewayProxyHandler } from 'aws-lambda';
import { document } from '../utils/dynamodbClient';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

interface IUserCertificate {
  id: string;
  name: string;
  created_at: string;
  grade: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  if (!event.pathParameters?.id) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Certificate ID is required',
      }),
    };
  }

  const { id } = event.pathParameters;

  const response = await document.send(
    new QueryCommand({
      TableName: 'users_certificate',
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': id,
      },
    }),
  );

  const userCertificate = response.Items?.[0] as IUserCertificate;

  if (userCertificate) {
    const bucket = process.env.S3_BUCKET_NAME ?? 'certificadoignite2021';
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Valid certificate',
        name: userCertificate.name,
        url: `https://${bucket}.s3.amazonaws.com/${id}.pdf`,
      }),
    };
  }

  return {
    statusCode: 404,
    body: JSON.stringify({
      message: 'Certificate not found',
    }),
  };
};
