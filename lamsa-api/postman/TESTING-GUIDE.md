# Lamsa API Testing Guide with Postman

## Table of Contents
1. [Introduction](#introduction)
2. [What is Postman?](#what-is-postman)
3. [Installation](#installation)
4. [Getting Started](#getting-started)
5. [Setting Up Your Environment](#setting-up-your-environment)
6. [Running Your First Test](#running-your-first-test)
7. [Understanding Variables](#understanding-variables)
8. [Testing Workflows](#testing-workflows)
9. [Troubleshooting](#troubleshooting)

---

## Introduction

Welcome to the Lamsa API testing guide! This guide will help you test the Lamsa beauty booking platform APIs, even if you've never used Postman before. By the end of this guide, you'll be able to:

- Set up Postman on your computer
- Import and use API collections
- Test various API endpoints
- Understand how the Lamsa platform works

## What is Postman?

Postman is a popular tool for testing APIs (Application Programming Interfaces). Think of it as a way to communicate with the Lamsa backend server, similar to how a mobile app would, but with a user-friendly interface that lets you see exactly what's happening.

### Why Use Postman?

- **Visual Interface**: See requests and responses clearly
- **Save Time**: Reuse requests without retyping
- **Test Automation**: Run multiple tests automatically
- **Team Collaboration**: Share collections with your team
- **Documentation**: Collections serve as living documentation

## Installation

### Step 1: Download Postman

1. Visit [https://www.postman.com/downloads/](https://www.postman.com/downloads/)
2. Choose your operating system (Windows, Mac, or Linux)
3. Download and install the application
4. Open Postman after installation

### Step 2: Create a Free Account (Optional but Recommended)

1. Click "Sign Up" in Postman
2. Create a free account using your email
3. This allows you to sync your work across devices

## Getting Started

### Step 1: Import the Collection

1. In Postman, click the **Import** button (top left)
2. Choose **File** tab
3. Navigate to `lamsa-api/postman/collections/`
4. Select `Lamsa-API-Complete.postman_collection.json`
5. Click **Import**

You should now see "Lamsa API Complete" in your Collections sidebar.

### Step 2: Import the Environment

Environments store variables like URLs and tokens that change between development and production.

1. Click the **Environments** icon (looks like an eye) in the sidebar
2. Click **Import**
3. Navigate to `lamsa-api/postman/environments/`
4. Select `development.postman_environment.json`
5. Click **Import**

### Step 3: Select the Environment

1. In the top-right corner, you'll see a dropdown that says "No Environment"
2. Click it and select **Lamsa Development**
3. The environment is now active!

## Setting Up Your Environment

### Understanding Environment Variables

Environment variables are placeholders that get replaced with actual values. For example:
- `{{api_url}}` becomes `http://localhost:3001`
- `{{customer_phone}}` becomes `+962771234567`

### Viewing and Editing Variables

1. Click the eye icon next to the environment dropdown
2. You'll see all current variables and their values
3. Click **Edit** to modify any values
4. Common variables you might need to change:
   - `api_url`: The server address (default: `http://localhost:3001`)
   - `customer_phone`: Test phone number
   - `provider_phone`: Provider test phone number

### Important Variables

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `api_url` | Server address | `http://localhost:3001` |
| `jwt_token` | Customer auth token | Auto-filled after login |
| `provider_token` | Provider auth token | Auto-filled after login |
| `customer_phone` | Test customer phone | `+962771234567` |
| `provider_phone` | Test provider phone | `+962791234567` |
| `test_otp` | Mock OTP for testing | `123456` (dev only) |

## Running Your First Test

Let's test the health check endpoint to make sure everything is working:

### Step 1: Start the API Server

First, make sure the Lamsa API is running:

```bash
cd lamsa-api
npm run dev
```

You should see: `Server started on port 3001`

### Step 2: Run Health Check

1. In Postman, expand **Lamsa API Complete** → **8. Health & Config**
2. Click on **Health Check**
3. Click the blue **Send** button
4. You should see a response like:

```json
{
    "success": true,
    "data": {
        "status": "healthy",
        "version": "1.0.0",
        "environment": "development"
    }
}
```

Congratulations! You've run your first API test!

## Understanding Variables

### How Variables Work

Variables in Postman use double curly braces: `{{variable_name}}`

When you see `{{api_url}}/api/health`, Postman replaces `{{api_url}}` with the actual value from your environment.

### Setting Variables Automatically

Many requests automatically save values for later use. For example:

1. When you verify an OTP, the response includes a token
2. The test script saves this token to `{{jwt_token}}`
3. Future requests use this token for authentication

### Types of Variables

1. **Environment Variables**: Specific to each environment (dev, staging, prod)
2. **Global Variables**: Available everywhere
3. **Collection Variables**: Specific to a collection
4. **Local Variables**: Temporary, within a single request

## Testing Workflows

### Complete Customer Journey

Here's how to test a complete customer flow:

#### 1. Create a Customer Account

1. Go to **1. Authentication** → **Customer Authentication**
2. Run **Send Customer OTP**
   - This sends an OTP to the test phone number
   - In development, you'll see `mockOtp` in the response
3. Run **Verify Customer OTP**
   - Uses the OTP from step 2
   - Saves the JWT token automatically

#### 2. Search for Providers

1. Go to **2. Provider Management**
2. Run **Search Providers**
   - Searches for providers near the test location
   - You can modify the search criteria in the request body

#### 3. Create a Booking

1. Go to **4. Booking System**
2. Run **Create Booking**
   - Uses the customer token automatically
   - Creates a booking with the test provider

#### 4. Check Your Bookings

1. Run **Get User Bookings**
   - Shows all bookings for the logged-in customer

### Provider Onboarding Flow

#### 1. Register as Provider

1. Go to **Test Data Setup** collection
2. Run the **2. Create Test Provider** folder in order:
   - Send OTP to Provider
   - Verify Provider Phone
   - Provider Signup

#### 2. Add Services

1. Go to **3. Service Management**
2. Run **Create Service**
   - Add services that the provider offers
   - Set prices and durations

#### 3. Set Availability

1. Go to **Test Data Setup** → **4. Set Provider Availability**
2. Run **Set Weekly Schedule**
   - Defines when the provider is available

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Could not get any response"

**Solution**: Make sure the API server is running:
```bash
cd lamsa-api
npm run dev
```

#### Issue: "401 Unauthorized"

**Solution**: You need to authenticate first:
1. Run the customer or provider login flow
2. Make sure the token is saved in your environment

#### Issue: "404 Not Found"

**Solution**: Check that:
1. The API URL is correct in your environment
2. The endpoint path is correct
3. The server is running

#### Issue: "Invalid phone number"

**Solution**: Use a valid Jordanian phone number format:
- International: `+962771234567`
- Local: `0771234567`
- Prefixes must be 77, 78, or 79

#### Issue: Variables not working

**Solution**:
1. Make sure an environment is selected
2. Check that the variable exists in the environment
3. Verify the variable has a value

### Checking Request Details

To see exactly what's being sent:

1. Click the **Console** at the bottom of Postman
2. Send a request
3. Click on the request in the console
4. You can see:
   - Request Headers
   - Request Body
   - Response Headers
   - Response Body

### Using the Test Results

Each request includes automatic tests. After sending a request:

1. Click the **Test Results** tab
2. Green checks ✓ mean tests passed
3. Red X means a test failed
4. Click on failed tests to see details

## Tips for Effective Testing

### 1. Use the Test Data Setup Collection First

Always run the Test Data Setup collection when starting fresh. It creates all necessary test data:
- Test customers
- Test providers
- Sample services
- Initial bookings

### 2. Check the Pre-request Scripts

Some requests have pre-request scripts that:
- Set up authentication headers
- Generate random data
- Prepare the request

Click the **Pre-request Script** tab to see what happens before the request.

### 3. Understand the Test Scripts

Test scripts run after the response. They:
- Validate the response
- Save important data to variables
- Check for errors

Click the **Tests** tab to see the validation logic.

### 4. Use Collection Runner for Automation

To run multiple requests automatically:

1. Click **Runner** at the bottom of Postman
2. Select the collection or folder to run
3. Choose your environment
4. Set iterations if needed
5. Click **Run**

### 5. Monitor API Performance

Watch the response time in Postman:
- Green: < 200ms (fast)
- Yellow: 200-1000ms (moderate)
- Red: > 1000ms (slow)

## Advanced Features

### Using Newman (Command Line)

Run tests from the terminal:

```bash
# Install Newman
npm install -g newman

# Run collection
newman run lamsa-api/postman/collections/Lamsa-API-Complete.postman_collection.json \
  -e lamsa-api/postman/environments/development.postman_environment.json
```

### Generating Documentation

1. In Postman, select your collection
2. Click the **...** menu
3. Select **View Documentation**
4. Click **Publish** to create online docs

### Team Collaboration

1. Create a team workspace in Postman
2. Share collections with team members
3. Use version control for collections
4. Add comments to requests

## Next Steps

Now that you understand the basics:

1. Read the **COMPREHENSIVE-TESTING-WALKTHROUGH.md** for detailed test scenarios
2. Check **testing-checklist.md** for a quick reference
3. Explore the API endpoints in the collection
4. Try modifying requests to test different scenarios
5. Create your own test collections

## Getting Help

If you need help:

1. Check the request description (click the request name)
2. Look at the example responses
3. Review the API documentation
4. Check the console for detailed error messages
5. Consult with the development team

Remember: Testing is about exploring and understanding the system. Don't be afraid to experiment!

---

Happy Testing! 🚀