// Google Apps Script for Blood Pressure Calculator
// Deploy this script as a web app to interact with Google Sheets

// Global variables
const SPREADSHEET_ID = '1WSj6AehZjc6mavAIqT7NNKRRqC-lQcJ4a1zbmKnjYvE'; // Replace with your actual spreadsheet ID

// Set up the web app
function doGet(e) {
  const action = e.parameter.action;
  
  try {
    if (action === 'saveUser') {
      return saveUser(e);
    } else if (action === 'getBloodPressureHistory') {
      return getBloodPressureHistory(e);
    } else if (action === 'saveBloodPressure') {
      return saveBloodPressureRecord(e);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid action'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle POST requests for blood pressure data
function doPost(e) {
  try {
    // Parse the JSON data from the request
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'saveBloodPressure') {
      return saveBloodPressureRecordPost(data);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid action'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
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
  
  if (!userId || !displayName) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing required parameters'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Check if master sheet exists, if not create it
  let masterSheet = ss.getSheetByName('MasterSheet');
  if (!masterSheet) {
    masterSheet = ss.insertSheet('MasterSheet');
    masterSheet.appendRow(['userId', 'displayName', 'pictureUrl', 'createdAt']);
  }
  
  // Check if user exists in master sheet
  const data = masterSheet.getDataRange().getValues();
  let userExists = false;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      userExists = true;
      break;
    }
  }
  
  if (!userExists) {
    const now = new Date().toISOString();
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
  let userSheet = ss.getSheetByName(userId + "_bp");
  
  if (!userSheet) {
    userSheet = ss.insertSheet(userId + "_bp");
    userSheet.appendRow(['日期', '收縮壓', '舒張壓', '心律', '血壓類別', '心律狀況', '提醒']);
  }
  
  return userSheet;
}

// Save blood pressure record (GET method)
function saveBloodPressureRecord(e) {
  const userId = e.parameter.userId;
  const date = e.parameter.date || new Date().toISOString();
  const systolic = e.parameter.systolic;
  const diastolic = e.parameter.diastolic;
  const heartrate = e.parameter.heartrate;
  const category = e.parameter.category;
  const heartrateStatus = e.parameter.heartrateStatus;
  const reminder = e.parameter.reminder;
  
  if (!userId || !systolic || !diastolic) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing required parameters'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Get or create user sheet
  let userSheet = ss.getSheetByName(userId + "_bp");
  if (!userSheet) {
    userSheet = ss.insertSheet(userId + "_bp");
    userSheet.appendRow(['日期', '收縮壓', '舒張壓', '心律', '血壓類別', '心律狀況', '提醒']);
  }
  
  // Add new blood pressure record
  userSheet.appendRow([date, systolic, diastolic, heartrate, category, heartrateStatus, reminder]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

// Save blood pressure record (POST method)
function saveBloodPressureRecordPost(data) {
  const userId = data.userId;
  const date = data.date || new Date().toISOString();
  const systolic = data.systolic;
  const diastolic = data.diastolic;
  const heartrate = data.heartrate;
  const category = data.category;
  const heartrateStatus = data.heartrateStatus;
  const reminder = data.reminder;
  
  if (!userId || !systolic || !diastolic) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing required parameters'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Get or create user sheet
  let userSheet = ss.getSheetByName(userId + "_bp");
  if (!userSheet) {
    userSheet = ss.insertSheet(userId + "_bp");
    userSheet.appendRow(['日期', '收縮壓', '舒張壓', '心律', '血壓類別', '心律狀況', '提醒']);
  }
  
  // Add new blood pressure record
  userSheet.appendRow([date, systolic, diastolic, heartrate, category, heartrateStatus, reminder]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

// Get blood pressure history for a user
function getBloodPressureHistory(e) {
  const userId = e.parameter.userId;
  
  if (!userId) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing userId parameter'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Get user blood pressure sheet
  const userSheet = ss.getSheetByName(userId + "_bp");
  if (!userSheet) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Get all data from the sheet
  const data = userSheet.getDataRange().getValues();
  
  // Remove header row
  const records = data.slice(1);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: records
  })).setMimeType(ContentService.MimeType.JSON);
}