/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

class ExcelDataExtension extends Autodesk.Viewing.Extension {
  constructor(viewer, options) {
    super(viewer, options);
    this._group = null;
    this._button = null;
  }

  load() {
    if (!window.XLSX) {
      console.error('SheetJS is required for this extension.');
      return false;
    }
    console.log('ExcelDataExtension has been loaded');
    return true;
  }

  unload() {
    // Clean our UI elements if we added any
    if (this._group) {
      this._group.removeControl(this._button);
      if (this._group.getNumberOfControls() === 0) {
        this.viewer.toolbar.removeControl(this._group);
      }
    }
    console.log('ExcelDataExtension has been unloaded');
    return true;
  }

  onToolbarCreated() {
    // Create a new toolbar group if it doesn't exist
    this._group = this.viewer.toolbar.getControl('ExcelDataExtensionToolbar');
    if (!this._group) {
      this._group = new Autodesk.Viewing.UI.ControlGroup('ExcelDataExtensionToolbar');
      this.viewer.toolbar.addControl(this._group);
    }

    // Add a new button to the toolbar group
    this._button = new Autodesk.Viewing.UI.Button('ExcelDataExtensionButton');
    this._button.onClick = async (ev) => {
      try {
        const data = await this.collectData();
        const workbook = this.generateWorkbook(data);
        this.downloadWorkbook(workbook, 'properties.xlsx');
      } catch (err) {
        console.error(err);
      }
    };
    this._button.setToolTip('Save properties of selected objects into an Excel spreadsheet.');
    this._button.addClass('ExcelDataExtensionIcon');
    this._group.addControl(this._button);
  }

  // Collects data to be exported, in this case properties of all selected objects
  async collectData() {
    const dbids = this.viewer.getSelection();
    return new Promise((resolve, reject) => {
      this.viewer.model.getBulkProperties(dbids, {}, (props) => {
        resolve(props);
      }, reject);
    });
  }

  // Generates an XLSX workbook for the output of the collectData method
  generateWorkbook(data) {
    const workbook = {
      SheetNames: [],
      Sheets: {}
    };
    for (const { dbId, properties } of data) {
      const name = `dbID ${dbId}`;
      workbook.SheetNames.push(name);
      workbook.Sheets[name] = this.generateSpreadsheet(properties);
    }
    return workbook;
  }

  // Generates an XLSX spreadsheet for properties of a specific object
  generateSpreadsheet(props) {
    const spreadsheet = {};
    const columns = ['displayCategory', 'displayName', 'displayValue', 'units'];
    spreadsheet[XLSX.utils.encode_cell({ c: 0, r: 0 })] = { v: 'Category', t: 's' };
    spreadsheet[XLSX.utils.encode_cell({ c: 1, r: 0 })] = { v: 'Name', t: 's' };
    spreadsheet[XLSX.utils.encode_cell({ c: 2, r: 0 })] = { v: 'Value', t: 's' };
    spreadsheet[XLSX.utils.encode_cell({ c: 3, r: 0 })] = { v: 'Units', t: 's' };
    let rows = 1;
    for (const prop of props) {
      if (prop.displayCategory.startsWith('__')) {
        continue;
      }
      for (const key of Object.keys(prop)) {
        if (columns.indexOf(key) !== -1) {
          const cell = XLSX.utils.encode_cell({ c: columns.indexOf(key), r: rows });
          const val = prop[key];
          spreadsheet[cell] = { v: (val && val.toString()) || '', t: 's' };
        }
      }
      rows++;
    }
    spreadsheet['!ref'] = `A1:D${rows + 1}`;
    return spreadsheet;
  }

  // Downloads an XLSX workbook
  downloadWorkbook(workbook, filename) {
    const data = XLSX.write(workbook, { bookType: 'xlsx', bookSST: true, type: 'base64' });
    const dataUri = 'data:application/octet-stream;base64,' + data;
    const a = document.createElement('a');
    a.setAttribute('href', dataUri);
    a.setAttribute('download', filename);
    a.click();
  }
}

/*
const statusCallback = (completed, message) => {
    $.notify(message, { className: "info", position:"bottom right" });
    $('#downloadExcel').prop("disabled", !completed);
};

////////////// START SECTION - NEEDS WORK TO BE TRANSPILED TO ES6 /////////////////////


if (!window.jQuery) alert('jQuery is required for this sample');
if (!window.XLSX) alert('Sheet JS is required for this sample');

var ForgeXLS = {
  Utility: {
    Constants: {
      BASE_URL: 'https://developer.api.autodesk.com',
      MODEL_DERIVATIVE_V2: function (urn) {
        return '/modelderivative/v2/' + (atob(urn.replace('_', '/')).indexOf('emea') > -1 ? 'regions/eu' : '') + '/designdata/'
      }
    },

    forgeGetRequest (url, token, callback) {
      jQuery.ajax({
        url: url,
        beforeSend: function (request) {
          request.setRequestHeader('Authorization', 'Bearer ' + token);
        },
        success: function (response) {
          if (response.result && response.result === 'success') {
            setTimeout(function () {
              $.notify('Please wait. Retrieving meta-data for ' + fileName, { className: "info", position: "bottom right" });
              ForgeXLS.Utility.forgeGetRequest(url, token, callback);
            }, 3000);
            return;
          }
          if (callback)
            callback(response);
        }
      });
    },
    getMetadata (urn, token, callback) {
      console.log('Downloading metadata...');
      this.forgeGetRequest(this.Constants.BASE_URL + this.Constants.MODEL_DERIVATIVE_V2(urn) + urn + '/metadata', token, callback);
    },

    getHierarchy (urn, guid, token, callback) {
      console.log('Downloading hierarchy...');
      this.forgeGetRequest(this.Constants.BASE_URL + this.Constants.MODEL_DERIVATIVE_V2(urn) + urn + '/metadata/' + guid, token, callback);
    },

    getProperties (urn, guid, token, callback) {
      console.log('Downloading properties...');
      this.forgeGetRequest(this.Constants.BASE_URL + this.Constants.MODEL_DERIVATIVE_V2(urn) + urn + '/metadata/' + guid + '/properties', token, callback);
    }
  },

  downloadXLSX (urn, fileName, token, status, fileType) {
    if (fileType.indexOf('rvt') == -1) {
      if (status) status(true, 'Not a Revit file. Only Revit files are supported, at the moment. Aborting conversion.');
      return;
    }

    if (status) {
      status(false, 'Preparing ' + fileName);
      status(false, 'Reading project information....');
    }

    this.prepareTables(urn, token, function (tables) {
      if (status) status(false, 'Building XLSX file...');

      var wb = new Workbook();
      jQuery.each(tables, function (name, table) {
        if (name.indexOf('<') == -1) { // skip tables starting with <
          var ws = ForgeXLS.sheetFromTable(table);
          wb.SheetNames.push(name);
          wb.Sheets[name] = ws;
        }
      });

      var wbout = XLSX.write(wb, { bookType: 'xlsx', bookSST: true, type: 'binary' });
      saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), fileName);

      if (status) status(true, 'Downloading...');
    })
  },

  sheetFromTable (table) {
    var ws = {};
    var range = { s: { c: 10000000, r: 10000000 }, e: { c: 0, r: 0 } };

    var allProperties = [];
    table.forEach(function (object) {
      jQuery.each(object, function (propName, propValue) {
        if (allProperties.indexOf(propName) == -1)
          allProperties.push(propName);
      })
    });

    table.forEach(function (object) {
      allProperties.forEach(function (propName) {
        if (!object.hasOwnProperty(propName))
          object[propName] = '';
      });
    });

    var propsNames = [];
    for (var propName in table[0]) {
      propsNames.push(propName);
    }
    //propsNames.sort(); // removed due first 3 ID columns

    var R = 0;
    //var C = 0;
    for (let C = 0; C != propsNames.length; ++C) {
      var cell_ref = XLSX.utils.encode_cell({ c: C, r: R });
      ws[cell_ref] = { v: propsNames[C], t: 's' };
    }
    R++;

    for (let index = 0; index != table.length; ++index) {
      C = 0;
      propsNames.forEach(function (propName) {
        if (range.s.r > R) range.s.r = 0;
        if (range.s.c > C) range.s.c = 0;
        if (range.e.r < R) range.e.r = R;
        if (range.e.c < C) range.e.c = C;
        var cell = { v: table[index][propName] };
        if (cell.v == null) return;
        var cell_ref = XLSX.utils.encode_cell({ c: C, r: R });

        if (typeof cell.v === 'number') cell.t = 'n';
        else if (typeof cell.v === 'boolean') cell.t = 'b';
        else if (cell.v instanceof Date) {
          cell.t = 'n';
          cell.z = XLSX.SSF._table[14];
          cell.v = datenum(cell.v);
        }
        else cell.t = 's';

        ws[cell_ref] = cell;
        C++;
      });
      R++;
    }
    if (range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
    return ws;
  },

  prepareTables (urn, token, callback) {
    this.Utility.getMetadata(urn, token, function (metadata) {
      if (metadata.data.metadata.length == 0) {
        alert('Unexpected metadata');
        return;
      }
      var guid = metadata.data.metadata[0].guid;

      ForgeXLS.Utility.getHierarchy(urn, guid, token, function (hierarchy) {
        ForgeXLS.Utility.getProperties(urn, guid, token, function (properties) {
          callback(ForgeXLS.prepareRawData(hierarchy, properties));
        });
      });
    });
  },

  prepareRawData (hierarchy, properties) {
    var tables = {};
    hierarchy.data.objects[0].objects.forEach(function (category) {
      var idsOnCategory = [];
      ForgeXLS.getAllElementsOnCategory(idsOnCategory, category.objects);

      var rows = [];
      idsOnCategory.forEach(function (objectid) {
        var columns = ForgeXLS.getProperties(objectid, properties);
        rows.push(columns);
      });
      tables[category.name] = rows;
    });
    return tables;
  },

  getAllElementsOnCategory (ids, category) {
    category.forEach(function (item) {
      if (typeof (item.objects) === 'undefined') {
        if (!ids.indexOf(item.objectid) >= 0)
          ids.push(item.objectid);
      }
      else
        ForgeXLS.getAllElementsOnCategory(ids, item.objects);
    });
  },

  getProperties (id, objCollection) {
    var data = {};
    objCollection.data.collection.forEach(function (obj) {
      if (obj.objectid != id) return;

      data['Viewer ID'] = id;
      data['Revit ID'] = obj.name.match(/\d+/g)[0];
      data['Name'] = obj.name.replace('[' + data['Revit ID'] + ']', '').trim();

      for (let propGroup in obj.properties) {
        if (propGroup.indexOf('__') > -1) break;
        if (obj.properties.hasOwnProperty(propGroup)) {
          for (var propName in obj.properties[propGroup]) {
            if (obj.properties[propGroup].hasOwnProperty(propName) && !Array.isArray(obj.properties[propGroup][propName]))
              data[propGroup + ':' + propName] = obj.properties[propGroup][propName];
          }
        }
      }
    });
    return data;
  }
};

class Workbook {
  constructor() {
      if (!(this instanceof Workbook))
          return new Workbook();
      this.SheetNames = [];
      this.Sheets = {};
  }
}

const datenum = (v, date1904) => {
  if (date1904) v += 1462;
  var epoch = Date.parse(v);
  return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
}

const s2ab = (s) => {
  var buf = new ArrayBuffer(s.length);
  var view = new Uint8Array(buf);

  for (let i = 0; i != s.length; ++i) {
    view[i] = s.charCodeAt(i) & 0xFF;
  }
  return buf;
}

////////////// END SECTION - NEEDS WORK TO BE TRANSPILED TO ES6 /////////////////////
*/

Autodesk.Viewing.theExtensionManager.registerExtension('ExcelDataExtension', ExcelDataExtension);
