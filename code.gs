// Google Apps Script for Blood Pressure Tracker

const SPREADSHEET_ID = '1WSj6AehZjc6mavAIqT7NNKRRqC-lQcJ4a1zbmKnjYvE'; // Replace with your actual spreadsheet ID

function doGet(e) {
  const action = e.parameter.action;
  
  try {
    if (action === 'getBloodPressureHistory') {
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

function doPost(e) {
  try {
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

// Create sheet for a specific user (only required columns)
function createUserSheet(userId, ss) {
  let userSheet = ss.getSheetByName(userId + "_bp");
  
  if (!userSheet) {
    userSheet = ss.insertSheet(userId + "_bp");
    userSheet.appendRow(['日期', '收縮壓', '舒張壓', '心律']);
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
  
  if (!userId || !systolic || !diastolic || !heartrate) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing required parameters'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let userSheet = ss.getSheetByName(userId + "_bp") || createUserSheet(userId, ss);
  
  userSheet.appendRow([date, systolic, diastolic, heartrate]);
  
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
  
  if (!userId || !systolic || !diastolic || !heartrate) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing required parameters'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let userSheet = ss.getSheetByName(userId + "_bp") || createUserSheet(userId, ss);
  
  userSheet.appendRow([date, systolic, diastolic, heartrate]);
  
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
  const userSheet = ss.getSheetByName(userId + "_bp");
  
  if (!userSheet) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = userSheet.getDataRange().getValues();
  const records = data.slice(1);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: records
  })).setMimeType(ContentService.MimeType.JSON);
}
