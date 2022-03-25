<h1 align="center">Serverless</h1>

## Technologies

This project was developed with the following technologies:

- [Node.js](https://nodejs.org/en/)
- [Typescript](https://www.typescriptlang.org/)
- [Serverless Framework](serverless.com/)
- [Puppeteer](https://github.com/puppeteer/puppeteer)
- [Amazon Lambda](https://aws.amazon.com/pt/lambda/)

## Project

The project is responsible for generating a certificate for a user and the possibility of searching the validity of a certificate.

## How to run

- Clone the repository and access the directory

### To run locally

- Run `yarn` to install the dependencies
- Run `yarn dynamodb:install` to download DynamoDB locally
- Run `yarn dynamo:start` to start the database in local environment
- Run, in another terminal, `yarn dev` to start the application in local environment

### To do the deployment

- Configure user credentials
- Run `yarn deploy` to upload the project to AWS Lambda