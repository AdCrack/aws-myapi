const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const serverless = require("serverless-http");
const { v4: uuidv4 } = require('uuid');
const swaggerUi = require('swagger-ui-express');
const specs = require('./swaggerDefinition');

const app = express();
app.use(bodyParser.json());

// AWS Configuration
const dynamodb = new AWS.DynamoDB.DocumentClient();
const cloudFormation = new AWS.CloudFormation();
const sns = new AWS.SNS(); // Include SNS configuration

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @swagger
 * /deploy-cf-template:
 *   post:
 *     summary: Deploy CloudFormation Template
 *     consumes:
 *       - application/json
 *     description: Endpoint to deploy CloudFormation template.
 *     parameters:
 *       - in: body
 *         name: body
 *         description: JSON object containing the table name.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             tableName:
 *               type: string
 *     responses:
 *       200:
 *         description: CloudFormation template deployed successfully.
 *       500:
 *         description: Internal server error.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tableName:
 *                 type: string
 *     examples:
 *       requestBodyExample:
 *         value:
 *           tableName: "exampleTableName"
 */

app.post('/deploy-cf-template', async (req, res) => {
  try {

    console.log("\n======> Inside API - deploy-cf-template");

    const { tableName } = req.body; 

    console.log("Request body:", req.body);

    // Update CloudFormation template with user-provided parameters
    const updatedTemplate = updateCloudFormationTemplate(tableName);

    // Deploy CloudFormation template
    const deploymentResult = await deployCloudFormationTemplate(updatedTemplate);

    // Send notification about successful deployment
    await sendNotification(req.body.userEmail, deploymentResult);

    res.json({ message: 'CloudFormation template deployed successfully' });
  } catch (error) {
    console.error('Error deploying CloudFormation template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to update CloudFormation template
function updateCloudFormationTemplate(tableName) {

  console.log("Updating CloudFormation template with table name:", tableName);

  const template = require('./template.json');
  template.Parameters.TableNameParam.Default = tableName;
  return template;
}

// Function to deploy CloudFormation template
async function deployCloudFormationTemplate(template) {
  console.log("Deploying CloudFormation template:", template);
  const stackParams = {
    StackName: `MyStack-${Date.now()}`,
    TemplateBody: JSON.stringify(template),
    Capabilities: ['CAPABILITY_IAM']
  };
  const result = await cloudFormation.createStack(stackParams).promise();
  console.log("Deployment result:", result);
  return result.StackId;
}

// Function to send notification using AWS SNS
async function sendNotification(email, message) {
  const params = {
    Message: message,
    Subject: 'CloudFormation Deployment Notification',
    TopicArn: 'arn:aws:sns:ap-south-1:585115321601:cfdeploy', // Replace with your SNS topic ARN
  };

  // Publish message to SNS topic
  await sns.publish(params).promise();
}

// API Endpoint to Save Data into DynamoDB Table


/**
 * @swagger
 * /save-data:
 *   post:
 *     summary: Save Data
 *     description: Endpoint to save data into DynamoDB table.
 *     parameters:
 *       - in: body
 *         name: body
 *         description: JSON object containing the data and table name.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             data:
 *               type: object
 *             tableName:
 *               type: string
 *     responses:
 *       200:
 *         description: Data saved successfully.
 *       500:
 *         description: Internal server error.
 */
app.post('/save-data', async (req, res) => {
  
  try {
    console.log("\n======> Inside API - save data :");
    const { data ,tableName } = req.body;

    console.log("\n======> data :" ,data);

    // Save data into DynamoDB table
    await saveDataToDynamoDB(tableName,data);

    console.log("\n======> after db save");

    res.json({ message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error saving data to DynamoDB:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to save data into DynamoDB
async function saveDataToDynamoDB(tableName,data) {
  const itemId = uuidv4();
  const params = {
    TableName: tableName, // Replace with your actual DynamoDB table name3
    Item: { id: itemId, ...data }
  };
  await dynamodb.put(params).promise();
}

// Lambda handler function
// exports.handler = async (event, context) => {
//   return app(event, context); // Directly return the Express app
// };

module.exports.handler = serverless(app);
