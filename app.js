const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');

const app = express();
app.use(bodyParser.json());

// AWS Configuration
const dynamodb = new AWS.DynamoDB.DocumentClient();
const cloudFormation = new AWS.CloudFormation();

// API Endpoint to Deploy CloudFormation Template
app.post('/deploy-cf-template', async (req, res) => {
  try {
    const { tableName } = req.body;
    
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
  const template = require('./template.json');
  template.Parameters.TableNameParam.Default = tableName;
  return template;
}

// Function to deploy CloudFormation template
async function deployCloudFormationTemplate(template) {
  const stackParams = {
    StackName: `MyStack-${Date.now()}`,
    TemplateBody: JSON.stringify(template),
    Capabilities: ['CAPABILITY_IAM']
  };
  const result = await cloudFormation.createStack(stackParams).promise();
  return result.StackId;
}

// Function to send notification using AWS SNS
async function sendNotification(email, message) {
  const params = {
    Message: message,
    Subject: 'CloudFormation Deployment Notification',
    TopicArn: 'arn:aws:sns:ap-south-1:585115321601:cfdeploy:8e76a6fd-7f48-4420-a865-63923d9b3327', // Replace with your SNS topic ARN
  };

  // Publish message to SNS topic
  await sns.publish(params).promise();
}


// API Endpoint to Save Data into DynamoDB Table
app.post('/save-data', async (req, res) => {
  try {
    const { data } = req.body;

    // Save data into DynamoDB table
    await saveDataToDynamoDB(data);

    res.json({ message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error saving data to DynamoDB:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to save data into DynamoDB
async function saveDataToDynamoDB(data) {
  const params = {
    TableName: 'YourDynamoDBTableName', // Replace with your actual DynamoDB table name
    Item: data
  };
  await dynamodb.put(params).promise();
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
