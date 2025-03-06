// Google Apps Script for Blood Pressure Calculator
// Deploy this script as a web app to interact with Google Sheets

// Global variables
const SPREADSHEET_ID = '1WSj6AehZjc6mavAIqT7NNKRRqC-lQcJ4a1zbmKnjYvE'; // Replace with your actual spreadsheet ID

// Set up the web app for GET requests
function doGet(e) {
  Logger.log('doGet called with parameters: ' + JSON.stringify(e.parameter));
  const action = e.parameter.action;
  
  try {
    if (action === 'saveUser') {
      Logger.log('Executing saveUser action');
      return saveUser(e);
    } else if (action === 'getBloodPressureHistory') {
      Logger.log('Executing getBloodPressureHistory action');
      return getBloodPressureHistory(e);
    } else {
      Logger.log('Invalid action requested: ' + action);
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid action'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle POST requests
function doPost(e) {
  Logger.log('doPost called');
  try {
    const data = JSON.parse(e.postData.contents);
    Logger.log('POST data received: ' + JSON.stringify(data));
    const action = data.action;
    
    if (action === 'saveBloodPressure') {
      Logger.log('Executing saveBloodPressure action');
      return saveBloodPressureRecord(data);
    } else {
      Logger.log('Invalid POST action: ' + action);
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid action'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Save user to master sheet
function saveUser(e) {
  const userId = e.parameter.userId;
  const displayName = e.parameter.displayName;
  const pictureUrl = e.parameter.pictureUrl;
  
  Logger.log('saveUser called with userId: ' + userId + ', displayName: ' + displayName);
  
  if (!userId || !displayName) {
    Logger.log('Missing required parameters in saveUser');
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing required parameters'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Check if master sheet exists, if not create it
  let masterSheet = ss.getSheetByName('MasterSheet');
  if (!masterSheet) {
    Logger.log('Creating new MasterSheet');
    masterSheet = ss.insertSheet('MasterSheet');
    masterSheet.appendRow(['userId', 'displayName', 'pictureUrl', 'createdAt']);
  }
  
  // Check if user exists in master sheet
  const data = masterSheet.getDataRange().getValues();
  let userExists = false;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      userExists = true;
      Logger.log('User already exists in MasterSheet');
      break;
    }
  }
  
  if (!userExists) {
    const now = new Date().toISOString();
    Logger.log('Adding new user to MasterSheet');
    masterSheet.appendRow([userId, displayName, pictureUrl, now]);
    
    // Create a sheet for this user
    createUserSheet(userId, ss);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

// Create sheet for a specific user
function createUserSheet(userId, ss) {
  Logger.log('Creating user sheet for userId: ' + userId);
  let userSheet = ss.getSheetByName(userId);
  
  if (!userSheet) {
    userSheet = ss.insertSheet(userId);
    userSheet.appendRow(['日期', '收縮壓 (mmHg)', '舒張壓 (mmHg)', '心律 (次/分)']);
    Logger.log('New user sheet created');
  } else {
    Logger.log('User sheet already exists');
  }
  
  return userSheet;
}

// Save blood pressure record
function saveBloodPressureRecord(data) {
  const userId = data.userId;
  const date = data.date;
  const systolic = data.systolic;
  const diastolic = data.diastolic;
  const heartrate = data.heartrate;
  
  Logger.log('Saving blood pressure record for user: ' + userId + 
             ', systolic: ' + systolic + 
             ', diastolic: ' + diastolic + 
             ', heartrate: ' + heartrate);
  
  if (!userId || !systolic || !diastolic || !heartrate) {
    Logger.log('Missing required parameters in saveBloodPressureRecord');
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing required parameters'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Get or create user sheet
  let userSheet = ss.getSheetByName(userId);
  if (!userSheet) {
    Logger.log('User sheet not found, creating new one');
    userSheet = createUserSheet(userId, ss);
  }
  
  // Add new blood pressure record
  Logger.log('Appending blood pressure record to user sheet');
  userSheet.appendRow([date, systolic, diastolic, heartrate]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

// Get blood pressure history for a user
function getBloodPressureHistory(e) {
  const userId = e.parameter.userId;
  
  Logger.log('Getting blood pressure history for user: ' + userId);
  
  if (!userId) {
    Logger.log('Missing userId parameter in getBloodPressureHistory');
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing userId parameter'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Get user sheet
  const userSheet = ss.getSheetByName(userId);
  if (!userSheet) {
    Logger.log('User sheet not found, returning empty data');
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Get all data from the sheet
  const data = userSheet.getDataRange().getValues();
  
  // Remove header row
  const records = data.slice(1);
  Logger.log('Retrieved ' + records.length + ' blood pressure records');
  
  // Sort records by date (newest first)
  records.sort((a, b) => new Date(b[0]) - new Date(a[0]));
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: records
  })).setMimeType(ContentService.MimeType.JSON);
}

// Test function for saveBloodPressureRecord
function testSaveBloodPressureRecord() {
  // Create test data
  const testData = {
    userId: "testUser123",
    date: new Date().toISOString(),
    systolic: 120,
    diastolic: 80,
    heartrate: 72
  };
  
  Logger.log('Running test for saveBloodPressureRecord with data: ' + JSON.stringify(testData));
  
  // Call the function to save the record
  const result = saveBloodPressureRecord(testData);
  
  // Parse the result
  const resultJson = JSON.parse(result.getContent());
  
  // Verify the operation was successful
  Logger.log('Test result: ' + (resultJson.success ? 'PASSED' : 'FAILED'));
  
  // Check if the data was actually saved
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const userSheet = ss.getSheetByName(testData.userId);
  
  if (userSheet) {
    const data = userSheet.getDataRange().getValues();
    Logger.log('Sheet data after test: ' + JSON.stringify(data));
    Logger.log('Total rows after test: ' + data.length);
  } else {
    Logger.log('User sheet not found after test - something went wrong');
  }
  
  return resultJson.success;
}