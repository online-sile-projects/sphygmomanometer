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
    } else if (action === 'saveBloodPressure') {
      Logger.log('Executing saveBloodPressure action via GET');
      return saveBloodPressureRecordFromGet(e);
    } else if (action === 'deleteBloodPressureRecord') {
      Logger.log('Executing deleteBloodPressureRecord action');
      return deleteBloodPressureRecord(e);
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

// Save blood pressure record from GET request parameters
function saveBloodPressureRecordFromGet(e) {
  const userId = e.parameter.userId;
  const date = e.parameter.date || new Date().toISOString();
  const systolic = parseInt(e.parameter.systolic);
  const diastolic = parseInt(e.parameter.diastolic);
  const heartrate = parseInt(e.parameter.heartrate);
  
  Logger.log('Saving blood pressure record from GET for user: ' + userId + 
             ', systolic: ' + systolic + 
             ', diastolic: ' + diastolic + 
             ', heartrate: ' + heartrate);
  
  if (!userId || !systolic || !diastolic || !heartrate) {
    Logger.log('Missing required parameters in saveBloodPressureRecordFromGet');
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing required parameters'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Create data object with the format expected by saveBloodPressureRecord
  const data = {
    userId: userId,
    date: date,
    systolic: systolic,
    diastolic: diastolic,
    heartrate: heartrate
  };
  
  // Use the existing save function
  return saveBloodPressureRecord(data);
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

// Test function for doGet to saveBloodPressureRecord
function testDoGetSaveBloodPressureRecord() {
  // Create a mock event object that simulates a GET request
  const mockEvent = {
    parameter: {
      action: 'saveBloodPressure',
      userId: 'testUserDoGet123',
      date: new Date().toISOString(),
      systolic: 130,
      diastolic: 85,
      heartrate: 75
    }
  };
  
  Logger.log('Running test for doGet with saveBloodPressure action');
  Logger.log('Test parameters: ' + JSON.stringify(mockEvent.parameter));
  
  // Call the doGet function with our mock event
  const result = doGet(mockEvent);
  
  // Parse the result
  const resultJson = JSON.parse(result.getContent());
  
  // Verify the operation result
  Logger.log('Test result: ' + JSON.stringify(resultJson));
  Logger.log('Test status: ' + (resultJson.success ? 'PASSED' : 'FAILED'));
  
  // Check if the data was actually saved
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const userSheet = ss.getSheetByName(mockEvent.parameter.userId);
  
  if (userSheet) {
    const data = userSheet.getDataRange().getValues();
    Logger.log('Sheet data after test: ' + JSON.stringify(data));
    Logger.log('Total rows after test: ' + data.length);
    
    // Check if the latest entry contains our test data
    if (data.length > 1) {
      const lastRow = data[data.length - 1];
      const matchesSystolic = lastRow[1] == mockEvent.parameter.systolic;
      const matchesDiastolic = lastRow[2] == mockEvent.parameter.diastolic;
      const matchesHeartrate = lastRow[3] == mockEvent.parameter.heartrate;
      
      Logger.log('Data verification: ' + 
                (matchesSystolic ? 'Systolic matches, ' : 'Systolic doesn\'t match, ') +
                (matchesDiastolic ? 'Diastolic matches, ' : 'Diastolic doesn\'t match, ') +
                (matchesHeartrate ? 'Heartrate matches' : 'Heartrate doesn\'t match'));
    }
  } else {
    Logger.log('User sheet not found after test - something went wrong');
  }
  
  return resultJson.success;
}

// Delete blood pressure record
function deleteBloodPressureRecord(e) {
  const userId = e.parameter.userId;
  const date = e.parameter.date;
  const systolic = e.parameter.systolic;
  const diastolic = e.parameter.diastolic;
  const heartrate = e.parameter.heartrate || '';
  
  Logger.log('deleteBloodPressureRecord called with userId: ' + userId + 
             ', date: ' + date + 
             ', systolic: ' + systolic + 
             ', diastolic: ' + diastolic + 
             ', heartrate: ' + heartrate);
  
  if (!userId || !date || !systolic || !diastolic) {
    Logger.log('Missing required parameters in deleteBloodPressureRecord');
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing required parameters'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let userSheet = ss.getSheetByName(userId);
    
    if (!userSheet) {
      Logger.log('User sheet not found for userId: ' + userId);
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'User sheet not found'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Get all data from the sheet
    const data = userSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      Logger.log('No records found to delete');
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'No records found'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Find the row to delete (skip header row)
    let rowToDelete = -1;
    const targetDate = new Date(date);
    
    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][0]);
      const rowSystolic = data[i][1];
      const rowDiastolic = data[i][2];
      const rowHeartrate = data[i][3] || '';
      
      // Compare date and blood pressure values
      if (Math.abs(targetDate.getTime() - rowDate.getTime()) < 1000 && // within 1 second
          rowSystolic == systolic && 
          rowDiastolic == diastolic && 
          rowHeartrate == heartrate) {
        rowToDelete = i + 1; // Google Sheets is 1-indexed
        break;
      }
    }
    
    if (rowToDelete === -1) {
      Logger.log('Record not found to delete');
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Record not found'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Delete the row
    userSheet.deleteRow(rowToDelete);
    
    Logger.log('Successfully deleted record from row: ' + rowToDelete);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Record deleted successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in deleteBloodPressureRecord: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}