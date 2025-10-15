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

  const response = await document.send(new QueryCommand({
    TableName: 'users_certificate',
    KeyConditionExpression: 'id = :id',
    ExpressionAttributeValues: {
      ':id': id,
    },
  }));

  const userCertificate = response.Items?.[0] as IUserCertificate;

  if (userCertificate) {
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Certificado válido',
        name: userCertificate.name,
        url: `https://certificadoignite2021.s3.amazonaws.com/${id}.pdf`,
      }),
    };
  }

  return {
    statusCode: 400,
    body: JSON.stringify({
      message: 'Certificado inválido',
    }),
  };
};
