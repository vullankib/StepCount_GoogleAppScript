function oneoffgoa() {

  var propertyStore = PropertiesService.getScriptProperties();
     
  cGoa.GoaApp.setPackage (propertyStore , { 
    clientId : "xxxxxxxxxx.apps.googleusercontent.com",
    clientSecret : "xxxxxxxxxxxxxxxxxxxxxxxx",
    scopes : cGoa.GoaApp.scopesGoogleExpand (['fitness.activity.read'],['spreadsheets']),
    service: 'google',
    packageName: 'fitness'
  });
}

function doGet(e) {

// running as the user running the app
    cGoa.GoaApp.userClone('fitness', PropertiesService.getScriptProperties() , PropertiesService.getUserProperties());
    var goa = cGoa.GoaApp.createGoa('fitness',PropertiesService.getUserProperties()).execute(e);

// it's possible that we need consent - this will cause a consent dialog
    if (goa.needsConsent()) {
      return goa.getConsent();
    }

// if we get here its time for your webapp to run and we should have a token, or thrown an error somewhere
    if (!goa.hasToken()) throw 'something went wrong with goa - did you check if consent was needed?';
// use it
    var endPoint = "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate";
   
    var ss = SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/xxxxx---SHEET--FOR---STORING---STEP---DATA---xxxxx/edit?usp=sharing') ;
    SpreadsheetApp.setActiveSpreadsheet(ss);

    var stepCountValues_row = ss.getRange("B1:B").getValues();
    var lastEnteredStepCountCell = Number(stepCountValues_row.filter(String).length);
    var sheet = ss.getActiveSheet();
    var date_val_start = sheet.getRange(lastEnteredStepCountCell+1,1).getValues();
    var date_val_end = sheet.getRange(lastEnteredStepCountCell+2,1).getValues();
    var today = new Date();

      do { 
      
      if (today.getDate() ==date_val_start[0][0].getDate()){ // The code for stepcount capture, shouldn't execute if run anytime today 
      return;
      }
      
      date_val_start = sheet.getRange(lastEnteredStepCountCell+1,1).getValues();
      date_val_end = sheet.getRange(lastEnteredStepCountCell+2,1).getValues();
      
     // encode it into a query
      var body = {
        "aggregateBy": [
          {
            "dataTypeName": "com.google.step_count.delta",
            "dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"
          }
        ],
        "bucketByTime": {
          "durationMillis": 86400000
        },
        "startTimeMillis": Date.UTC(2019,date_val_start[0][0].getMonth(),date_val_start[0][0].getDate(),6,0,0),
        "endTimeMillis": Date.UTC(2019,date_val_end[0][0].getMonth(),date_val_end[0][0].getDate(),6,0,0)
    };
      
      // send it to cloud vision, using the access token
      var response = UrlFetchApp.fetch ( endPoint, {
        method: "POST",
        payload: JSON.stringify(body),
        contentType: "application/json",
        headers: {
          Authorization:'Bearer ' + goa.getToken()
        }
      });
    
      var dataAll = JSON.parse(response.getContentText()); 
      var stepCountVal_int = dataAll["bucket"][0]["dataset"][0]["point"][0]["value"][0]["intVal"];

// Accessing Google Spreadsheet where we plan to store the Daily Step Count with Date Stamp
      sheet.getRange(lastEnteredStepCountCell+1,2).setValue(stepCountVal_int);
      sheet.getRange(lastEnteredStepCountCell+1,3).setValue(date_val_start[0][0].getMonth()+1);      


      var months = [ "JAN", "FEB", "MAR", "APR", "MAY", "JUN","JUL", "AUG", "SEP", "OCT", "NOV", "DEC" ];      
      var selectedMonthName = months[date_val_start[0][0].getMonth()];       

      var ssaggr = SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/xxxx----SHEET---FOR----STORING----AGGREGATE---DATA---XXXX/edit?usp=sharing') ;
      SpreadsheetApp.setActiveSpreadsheet(ssaggr); 
      var sheet_aggr = ssaggr.getActiveSheet();
      var monthVal_lastRow = sheet_aggr.getRange("B1:B").getValues();
      var lastEnteredMonthCell = Number(monthVal_lastRow.filter(String).length);
      
      if((lastEnteredMonthCell-3)!=(date_val_start[0][0].getMonth()+1)){ // this is executed for creating a new Month row in the Aggregate sheet
          sheet_aggr.getRange(lastEnteredMonthCell+1,1).setValue(selectedMonthName);
          sheet_aggr.getRange(lastEnteredMonthCell+1,2).setValue(stepCountVal_int);
      }
      else{
          var present_month_aggr = sheet_aggr.getRange(lastEnteredMonthCell,2).getValues()[0][0];
          present_month_aggr=present_month_aggr+stepCountVal_int;
          sheet_aggr.getRange(lastEnteredMonthCell,2).setValue(present_month_aggr);
      }

//YTD Aggregate value upate
          var present_ytd_aggr = sheet_aggr.getRange(3,2).getValues()[0][0];
          present_ytd_aggr=present_ytd_aggr+stepCountVal_int;
          sheet_aggr.getRange(3,2).setValue(present_ytd_aggr);

      lastEnteredStepCountCell++;          
      
      }while(today.getDate() !=date_val_end[0][0].getDate() || today.getMonth() !=date_val_end[0][0].getMonth())
    
return 
 {
// Commenting below line for trying out HTML return. Please switch this back to original if it doesn't work
   data:JSON.parse(response.getContentText())
 }

}
