"use strict";

document.addEventListener("DOMContentLoaded", function(event) {
      var buttonsDiv = document.getElementById("buttons");
      var confirmationBtn = document.createElement("input");
      confirmationBtn.id = "confirm_changes";
      confirmationBtn.type = "submit";
      confirmationBtn.value = "Zatwierdź";
      confirmationBtn.hidden = true;
      buttonsDiv.appendChild(confirmationBtn);
      var cancelBtn = document.createElement("input");
      cancelBtn.id = "cancel_changes";
      cancelBtn.type = "button";
      cancelBtn.value = "Odrzuć";
      cancelBtn.hidden = true;
      buttonsDiv.appendChild(cancelBtn);
})

var add_mode = false;
var edit_mode = false;
var delete_mode = false;
var edit_row = 0;

function addRecordMode() {
      var method = document.getElementById("method_tunnel");
      var editRecordBtn = document.getElementById("edit_record");
      var deleteRecordBtn = document.getElementById("delete_record");
      var confirmationBtn = document.getElementById("confirm_changes");
      var cancelBtn = document.getElementById("cancel_changes");
      if(add_mode) {
            editRecordBtn.hidden = true;
            deleteRecordBtn.hidden = true;
            confirmationBtn.hidden = false;
            cancelBtn.hidden = false;
            method.value = "post";
            cancelBtn.setAttribute("onclick", "addRecordCancelProcedure();");
      } else {
            editRecordBtn.hidden = false;
            deleteRecordBtn.hidden = false;
            confirmationBtn.hidden = true;
            cancelBtn.hidden = true;
            cancelBtn.setAttribute("onclick", "");
      }
}

function addRecordCancelProcedure() {
      var method = document.getElementById("method_tunnel");
      method.value = "";
      
      const tr_tmp = document.getElementsByClassName("tr_tmp");
      while(tr_tmp.length > 0) {
            tr_tmp[0].parentNode.removeChild(tr_tmp[0]);
      }

      add_mode = false;
      edit_row = 0;
      addRecordMode();
}

function addRecord() {
      var table = document.getElementById("registry_records_table");
      var tr = document.createElement("tr");
      tr.id = "tr_tmp_" + edit_row;
      tr.className = "tr_tmp";
      var columns_number = table.rows[0].cells.length;
      for(let i = 0; i < columns_number; i++) {
            var td = document.createElement("td");
            td.className = "td_tmp";
            var input = document.createElement("input");
            input.id = "edit_input_" + edit_row + "_" + (i+1);
            input.name = "new_" + edit_row + "_" + (i+1);
            input.className = "cr_edit_input";
            input.required = true;
            if(i == 0) {
                  input.type = "text";
            } else {
                  input.type = "number";
                  input.min = "0";
            }

            td.appendChild(input);
            tr.appendChild(td);
      }

      var td_deleteBtn = document.createElement("td");
      td_deleteBtn.id = "td_delete_btn_" + edit_row;
      td_deleteBtn.className = "td_tmp";
      td_deleteBtn.style.border = "none";

      var deleteNewRecordBtn = document.createElement("input");
      deleteNewRecordBtn.id = "delete_new_record_" + edit_row;
      deleteNewRecordBtn.type = "button";
      deleteNewRecordBtn.value = "🗑";
      deleteNewRecordBtn.setAttribute("onclick", "deleteRecord('add', this.id);");

      td_deleteBtn.appendChild(deleteNewRecordBtn);
      tr.appendChild(td_deleteBtn);
      table.appendChild(tr);

      edit_row += 1;

      if(!add_mode) {
            add_mode = true;
            addRecordMode();
      }
}

function editRecordMode() {
      var method = document.getElementById("method_tunnel");
      var addRecordBtn = document.getElementById("add_record");
      var editRecordBtn = document.getElementById("edit_record");
      var deleteRecordBtn = document.getElementById("delete_record");
      var confirmationBtn = document.getElementById("confirm_changes");
      var cancelBtn = document.getElementById("cancel_changes");
      if(edit_mode) {
            addRecordBtn.hidden = true;
            editRecordBtn.hidden = true;
            deleteRecordBtn.hidden = true;
            confirmationBtn.hidden = false;
            cancelBtn.hidden = false;
            method.value = "put";
            cancelBtn.setAttribute("onclick", "editRecordCancelProcedure();");
      } else {
            addRecordBtn.hidden = false;
            editRecordBtn.hidden = false;
            deleteRecordBtn.hidden = false;
            confirmationBtn.hidden = true;
            cancelBtn.hidden = true;
            cancelBtn.setAttribute("onclick", "");
      }
}

function editRecordCancelProcedure() {
      var method = document.getElementById("method_tunnel");
      method.value = "";

      var tr = Array.from(document.getElementsByClassName("record"));
      tr.forEach(element => {
            let i = 0;
            element = Array.from(element.children);
            element.forEach(td => {
                  var span = td.children[0];
                  td.innerHTML = span.innerHTML;
            })
      })

      edit_mode = false;
      edit_row = 0;
      editRecordMode();
}

function editRecord() {
      var tr = Array.from(document.getElementsByClassName("record"));
      tr.forEach(element => {
            let i = 0;
            element = Array.from(element.children);
            element.forEach(td => {
                  var record_id = td.id.split("_");
                  record_id = record_id[1];
                  var input = document.createElement("input");
                  input.id = "edit_input_" + edit_row + "_" + (i+1);
                  input.className = "cr_edit_input";
                  input.name = "" + record_id + "_" + (i+1);
                  input.value = td.innerHTML;
                  input.required = true;
                  if(i == 0) {
                        input.type = "text";
                  } else {
                        input.type = "number";
                        input.min = "0";
                  }

                  var span = document.createElement("span");
                  span.innerHTML = td.innerHTML;
                  span.hidden = true;
                  td.innerHTML = "";
                  td.appendChild(span);
                  td.appendChild(input);
                  i++;
            })

            edit_row += 1;
      });

      if(!edit_mode) {
            edit_mode = true;
            editRecordMode();
      }
}

function deleteRecordMode() {
      var method = document.getElementById("method_tunnel");
      var addRecordBtn = document.getElementById("add_record");
      var editRecordBtn = document.getElementById("edit_record");
      var deleteRecordBtn = document.getElementById("delete_record");
      var confirmationBtn = document.getElementById("confirm_changes");
      var cancelBtn = document.getElementById("cancel_changes");
      if(delete_mode) {
            addRecordBtn.hidden = true;
            editRecordBtn.hidden = true;
            deleteRecordBtn.hidden = true;
            confirmationBtn.hidden = false;
            cancelBtn.hidden = false;
            method.value = "delete";
            cancelBtn.setAttribute("onclick", "deleteRecordCancelProcedure();");
            var deletedRecordsTable = document.createElement("table");
            deletedRecordsTable.id = "deleted_records";
            deletedRecordsTable.hidden = true;
            document.body.appendChild(deletedRecordsTable); 
      } else {
            addRecordBtn.hidden = false;
            editRecordBtn.hidden = false;
            deleteRecordBtn.hidden = false;
            confirmationBtn.hidden = true;
            cancelBtn.hidden = true;
            cancelBtn.setAttribute("onclick", "");
            var deletedRecordsTable = document.getElementById("deleted_records");
            document.body.removeChild(deletedRecordsTable);
      }
}

function deleteRecordCancelProcedure() {
      var method = document.getElementById("method_tunnel");
      var table = document.getElementById("registry_records_table");
      var deletedRecordsTable = Array.from(document.getElementById("deleted_records").children);
      var deleteBtn = document.getElementsByClassName("deleteBtn");
      var deletedRecord = document.getElementsByClassName("deleted_record");
      
      deletedRecordsTable.forEach(element => {
            table.appendChild(element);
      })

      while(deleteBtn.length > 0) {
            deleteBtn[0].parentNode.removeChild(deleteBtn[0]);
      }

      while(deletedRecord.length > 0) {
            deletedRecord[0].parentNode.removeChild(deletedRecord[0]);
      }

      method.value = "";
      delete_mode = false;
      edit_row = 0;
      deleteRecordMode();
}

function deleteRecord(mode, btnId=null) {
      if(mode == "add") {
            var tr_id = btnId.split("_");
            tr_id = tr_id[tr_id.length-1];
            const tr_tmp = document.getElementById("tr_tmp_" + tr_id);
            tr_tmp.remove();

            if(document.getElementsByClassName("tr_tmp").length == 0) {
                  add_mode = false;
                  addRecordMode();
            }
      } else {
            var tr = Array.from(document.getElementsByClassName("record"));
            tr.forEach(row => {
                  var record_id = row.id.split("_");
                  record_id = record_id[1];
                  var deleteRecordBtn = document.createElement("input");
                  deleteRecordBtn.id = "delete_record_" + record_id;
                  deleteRecordBtn.className = "deleteBtn";
                  deleteRecordBtn.type = "button";
                  deleteRecordBtn.value = "🗑";
                  deleteRecordBtn.setAttribute("onclick", "deleteHideRecord(this.id);");

                  row.append(deleteRecordBtn);

                  edit_row += 1;
            })

            if(!delete_mode) {
                  delete_mode = true;
                  deleteRecordMode();
            }
      }
}

function deleteHideRecord(btnId) {
      var table = document.getElementById("registry_records_table");
      var deletedRecordsTable = document.getElementById("deleted_records");
      var deleteBtn = document.getElementById(btnId);
      var tr_id = btnId.split("_");
      tr_id = tr_id[tr_id.length-1];
      var record = document.getElementById("record_" + tr_id);
      record.removeChild(deleteBtn);
      deletedRecordsTable.appendChild(record);
      var input = document.createElement("input");
      input.id = "delete_input_" + tr_id;
      input.className = "deleted_record";
      input.name = tr_id;
      input.hidden = true;
      table.appendChild(input);
}