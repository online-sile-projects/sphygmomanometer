// Google Apps Script for Blood Pressure Calculator
// Deploy this script as a web app to interact with Google Sheets

// Global variables
const SPREADSHEET_ID = '1WSj6AehZjc6mavAIqT7NNKRRqC-lQcJ4a1zbmKnjYvE'; // Replace with your actual spreadsheet ID

// Set up the web app for GET requests
function doGet(e) {
  const action = e.parameter.action;
  
  try {
    if (action === 'saveUser') {
      return saveUser(e);
    } else if (action === 'getBloodPressureHistory') {
      return getBloodPressureHistory(e);
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

// Handle POST requests
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'saveBloodPressure') {
      return saveBloodPressureRecord(data);
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
  let userSheet = ss.getSheetByName(userId);
  
  if (!userSheet) {
    userSheet = ss.insertSheet(userId);
    userSheet.appendRow(['日期', '收縮壓 (mmHg)', '舒張壓 (mmHg)', '心律 (次/分)', '類別', '心律狀況', '提醒']);
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
  
  if (!userId || !systolic || !diastolic || !heartrate) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Missing required parameters'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Calculate category, heartrateStatus and reminder based on the values
  const category = calculateBloodPressureCategory(systolic, diastolic);
  const heartrateStatus = calculateHeartrateStatus(heartrate);
  const reminder = generateReminder(category, heartrateStatus);
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Get or create user sheet
  let userSheet = ss.getSheetByName(userId);
  if (!userSheet) {
    userSheet = createUserSheet(userId, ss);
  }
  
  // Add new blood pressure record
  userSheet.appendRow([date, systolic, diastolic, heartrate, category, heartrateStatus, reminder]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

// Calculate blood pressure category
function calculateBloodPressureCategory(systolic, diastolic) {
  systolic = parseFloat(systolic);
  diastolic = parseFloat(diastolic);
  
  if (systolic < 90 || diastolic < 60) {
    return '低血壓';
  } else if (systolic >= 90 && systolic <= 120 && diastolic >= 60 && diastolic <= 80) {
    return '正常血壓';
  } else if ((systolic > 120 && systolic < 130) || diastolic == 80) {
    return '血壓偏高';
  } else if ((systolic >= 130 && systolic <= 140) || (diastolic > 80 && diastolic <= 90)) {
    return '高血壓 (前期)';
  } else if (systolic > 140 || diastolic > 90) {
    return '高血壓 (危險)';
  }
  return '未知';
}

// Calculate heartrate status
function calculateHeartrateStatus(heartrate) {
  heartrate = parseFloat(heartrate);
  
  if (heartrate < 60) {
    return '心律過慢';
  } else if (heartrate > 100) {
    return '心律過快';
  } else {
    return '心律正常';
  }
}

// Generate reminder message
function generateReminder(category, heartrateStatus) {
  let reminder = '';
  
  if (category === '低血壓') {
    reminder = '可能疲倦、暈眩，甚至暈厥。';
  } else if (category === '正常血壓') {
    reminder = '很棒，繼續保持。';
  } else if (category === '血壓偏高') {
    reminder = '通常沒有症狀，要開始留意。';
  } else if (category === '高血壓 (前期)') {
    reminder = '通常沒有症狀。心腦血管疾病需服藥。';
  } else if (category === '高血壓 (危險)') {
    reminder = '身體通常已受影響，較危險。';
  }
  
  // 根據心律添加額外提醒
  if (heartrateStatus === '心律過慢') {
    reminder += ' 心律過慢可能導致疲勞、頭暈，嚴重時可能暈厥。';
  } else if (heartrateStatus === '心律過快') {
    reminder += ' 心律過快可能感到心悸、胸悶，或呼吸困難。';
  }
  
  return reminder;
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
  
  // Get user sheet
  const userSheet = ss.getSheetByName(userId);
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
  
  // Sort records by date (newest first)
  records.sort((a, b) => new Date(b[0]) - new Date(a[0]));
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: records
  })).setMimeType(ContentService.MimeType.JSON);
}