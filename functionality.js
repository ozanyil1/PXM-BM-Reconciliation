document.addEventListener('DOMContentLoaded', function () {

    // Global arrays
    window.ConnectorRouteArray = [];
    window.PrimeXMPositionsArray = [];
    window.MT5PositionsArray = [];
    window.MT5TradingAccountsArray = [];
    window.MT5ConfigObject = {};
    window.aggregatedArray = [];
    window.netFullBookArray = [];
    window.netBBookArray = [];
    window.fullBookCrossCheckArray = [];
    window.BBookCrossCheckArray = [];

    // Read config.txt as soon as DOM loads
    function loadConfigFile() {
        // Assuming config.txt is in the same directory as your HTML/JS files
        fetch('config.txt')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(textContent => {
                console.log("MT5 Config Data:", textContent);
                // Parse the content of config.txt as JSON
                try {
                    window.MT5ConfigObject = JSON.parse(textContent);
                    console.log("MT5ConfigObject:", window.MT5ConfigObject);
                } catch (error) {
                    console.error("Failed to parse config.txt:", error);
                }
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    }

    // Call loadConfigFile to read config.txt as soon as the DOM loads
    loadConfigFile();

    // Helper function to parse CSV and create an array of objects with only required headers
    function parseCSVToArray(file, requiredHeaders, callback, delimiter = ',', startFromRow = 0, applyTransformations = false) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const csvContent = e.target.result; // Get the file content as a string
            const lines = csvContent.split('\n'); // Split into rows by new lines

            // Check if lines are empty or not
            if (lines.length <= startFromRow) {
                alert("File is empty or startFromRow is out of range");
                return;
            }

            // Determine headers based on the row to start parsing from
            const headers = lines[startFromRow].split(delimiter).map(header => header.trim());

            // Check if all required headers are present
            const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

            if (missingHeaders.length > 0) {
                alert("Missing headers: " + missingHeaders.join(', ')); // Show missing headers
            } else {
                // Create an array of objects with only required headers
                const dataArray = [];
                for (let i = startFromRow + 1; i < lines.length; i++) { // Start from the row after the header row
                    const row = lines[i].split(delimiter).map(item => item.trim());
                    if (row.length === headers.length) {
                        const obj = {};
                        // Only include the necessary headers and their corresponding values
                        requiredHeaders.forEach((requiredHeader) => {
                            const index = headers.indexOf(requiredHeader);
                         
                            obj[requiredHeader] = String(row[index]); // Match required header with row data
                        });

                        // Apply transformations if required
                        if (applyTransformations) {
                            // Remove text after '.' in Symbol
                            if (obj['Symbol']) {
                                obj['Symbol'] = obj['Symbol'].split('.')[0]; // Keep only text before '.'
                            }
                        }
                        dataArray.push(obj); // Push the object to the array
                    }
                }
                callback(dataArray); // Pass the array for further processing
            }
        };
        reader.readAsText(file); // Read the file as text
    }

    // Function to create a table in the HTML from the array of objects
    function createTable(dataArray, containerId) {
        let tableContainer = document.getElementById(containerId);
    
        // Create table element
        const table = document.createElement('table');
        table.setAttribute('border', '1');
    
        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        Object.keys(dataArray[0]).forEach(key => {
            const th = document.createElement('th');
            th.textContent = key; // Use the key as the header
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
    
        // Create table body
        const tbody = document.createElement('tbody');
        dataArray.forEach(rowData => {
            const tr = document.createElement('tr');
            Object.values(rowData).forEach(value => {
                const td = document.createElement('td');
                td.textContent = value; // Add the cell value
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
    
        // Append the table to the container or the wrapper if applicable
        if (containerId === 'table-container') {
            // Check if the wrapper exists
            let wrapper = tableContainer.querySelector('.table-wrapper');
            if (!wrapper) {
                // Create a wrapper if it doesn't exist
                wrapper = document.createElement('div');
                wrapper.className = 'table-wrapper';
                tableContainer.appendChild(wrapper);
            }
            // Append the table to the wrapper
            wrapper.appendChild(table);
        } else {
            tableContainer.appendChild(table);
        }
    }

    // Function to check if all required files are selected
    function checkFilesSelected() {
        const fileInputs = [
            document.getElementById('fileInput2'),
            document.getElementById('fileInput3'),
            document.getElementById('fileInput4')
        ];
        const runButton = document.getElementById('runButton');

        // Check if all required file inputs have files
        const allFilesSelected = fileInputs.every(input => input.files.length > 0);

        // Enable or disable the run button based on whether all required files are selected
        runButton.disabled = !allFilesSelected;
    }

    // Browse for ConnectorRoute Rules CSV (input file 1)
    document.getElementById('browseButton1').addEventListener('click', function() {
        document.getElementById('fileInput1').click();  // Trigger file input click
    });

    // When a file is selected for ConnectorRoute Rules (input file 1)
    document.getElementById('fileInput1').addEventListener('change', function() {
        const file = document.getElementById('fileInput1').files[0];
        if (!file) return;

        const filePath1 = file.name;
        document.getElementById('filePath1').value = filePath1;

        // Required headers for ConnectorRoute Rules
        const requiredHeaders = ['connector', 'sym', 'subid1', 'subid3','target'];

        // Parse the CSV file and create an array of objects with only required headers
        parseCSVToArray(file, requiredHeaders, function(dataArray) {


            dataArray.forEach(item => {
                if (item.sym.includes('.')) {
                    item.sym = item.sym.split('.')[0]; // Keep only the part before the dot
                }
            });

            // Assign dataArray to ConnectorRouteArray
            window.ConnectorRouteArray = dataArray;
            console.log("ConnectorRouteArray:", window.ConnectorRouteArray);

            // Create a table in the HTML from the parsed data
            createTable(window.ConnectorRouteArray, 'table-container');
        });
    });

    // Browse for PrimeXM Positions CSV (input file 2)
    document.getElementById('browseButton2').addEventListener('click', function() {
        document.getElementById('fileInput2').click();  // Trigger file input click
    });

    // When a file is selected for PrimeXM Positions (input file 2)
    document.getElementById('fileInput2').addEventListener('change', function() {
        const file = document.getElementById('fileInput2').files[0];
        if (!file) return;

        const filePath2 = file.name;
        document.getElementById('filePath2').value = filePath2;

        // Required headers for PrimeXM Positions
        const requiredHeaders = ['Account', 'Symbol', 'Base', 'Overflow'];

        // Parse the CSV file and create an array of objects with only required headers
        parseCSVToArray(file, requiredHeaders, function(dataArray) {

            // Assign dataArray to PrimeXMPositionsArray
            window.PrimeXMPositionsArray = dataArray;
            console.log("PrimeXMPositionsArray:", window.PrimeXMPositionsArray);

            // Apply transformation to remove text after '.'
            window.PrimeXMPositionsArray.forEach(item => {
                if (item['Symbol']) {
                    item['Symbol'] = item['Symbol'].split('.')[0]; // Keep only text before '.'
                }
            });

            window.PrimeXMPositionsArray.forEach(item => {
                if (item["Base"]) {
                    item["Base"] = parseFloat(item["Base"]);
                }
                if (item["Overflow"]) {
                    item["Overflow"] = parseFloat(item["Overflow"]);
                }
            });

            // Create a table in the same container as the first table
            createTable(window.PrimeXMPositionsArray, 'table-container');
        }, ','); // No transformations applied
        // Check if all required files are selected
        checkFilesSelected();
    });

    // Browse for MT5 Positions CSV (input file 3)
    document.getElementById('browseButton3').addEventListener('click', function() {
        document.getElementById('fileInput3').click();  // Trigger file input click
    });

    // When a file is selected for MT5 Positions (input file 3)
    document.getElementById('fileInput3').addEventListener('change', function() {
        const file = document.getElementById('fileInput3').files[0];
        if (!file) return;

        const filePath3 = file.name;
        document.getElementById('filePath3').value = filePath3;

        // Required headers for MT5 Positions
        const requiredHeaders = ['Login', 'Symbol', 'Type', 'Volume'];

        // Parse the CSV file and create an array of objects with only required headers, using semicolon as delimiter
        parseCSVToArray(file, requiredHeaders, function(dataArray) {

            // Assign dataArray to MT5PositionsArray
            window.MT5PositionsArray = dataArray;

            // Remove text after '.' in Symbol and apply transformations to Volume
            window.MT5PositionsArray.forEach(item => {
                if (item['Symbol']) {
                    item['Symbol'] = item['Symbol'].split('.')[0]; // Keep only text before '.'
                }

                if (item["Volume"].includes("K")) {
                    item["Volume"] = item["Volume"].replace('.', '');
                    item["Volume"] = item["Volume"].replace('K', '000');
                }

                // Apply transformation to Volume based on Type
                if (item['Type'] === 'sell') {
                    item['Volume'] = parseFloat(item['Volume']) * -1; // Multiply volume by -1 if type is 'sell'
                } else if (item['Type'] === 'buy') {
                    item['Volume'] = parseFloat(item['Volume']) * 1; // Multiply volume by 1 if type is 'buy'
                }

                // Round volume to two decimal places
                item['Volume'] = Math.round(item['Volume'] * 100) / 100;
            });

            console.log("Parsed MT5 Positions Data:", window.MT5PositionsArray);

            // Aggregate volumes by Login and Symbol
            const aggregatedData = {};

            window.MT5PositionsArray.forEach(item => {
                const key = `${item['Login']}_${item['Symbol']}`;
                if (!aggregatedData[key]) {
                    aggregatedData[key] = { ...item };
                } else {
                    aggregatedData[key]['Volume'] += parseFloat(item['Volume']); // Sum volumes for matching Login and Symbol
                    // Round aggregated volume to two decimal places
                    aggregatedData[key]['Volume'] = Math.round(aggregatedData[key]['Volume'] * 100) / 100;
                }
            });

            // Convert aggregatedData to an array and filter out elements with volume 0
            window.aggregatedArray = Object.values(aggregatedData).filter(item => item['Volume'] !== 0);

            console.log("Aggregated MT5 Positions Data:", window.aggregatedArray);

            // Create a table in the same container as the previous tables
            createTable(aggregatedArray, 'table-container'); // Reuse the existing container
        }, ';', 1, false); // Pass semicolon as the delimiter, start parsing from the second row, and do not apply transformations
        // Check if all required files are selected
        checkFilesSelected();
    });

    // Browse for MT5 Trading Accounts CSV (input file 4)
    document.getElementById('browseButton4').addEventListener('click', function() {
        document.getElementById('fileInput4').click();  // Trigger file input click
    });

    // When a file is selected for MT5 Trading Accounts (input file 4)
    document.getElementById('fileInput4').addEventListener('change', function() {
        const file = document.getElementById('fileInput4').files[0];
        if (!file) return;

        const filePath4 = file.name;
        document.getElementById('filePath4').value = filePath4;

        // Required headers for MT5 Trading Accounts
        const requiredHeaders = ['Login', 'Name', 'Group'];

        // Parse the CSV file and create an array of objects with only required headers, using semicolon as delimiter
        parseCSVToArray(file, requiredHeaders, function(dataArray) {

            // Assign dataArray to MT5TradingAccountsArray
            window.MT5TradingAccountsArray = dataArray;
            console.log("MT5TradingAccountsArray:", window.MT5TradingAccountsArray);

            // Create a table in the same container as the previous tables
            createTable(window.MT5TradingAccountsArray, 'table-container'); // Reuse the existing container
        }, ';', 1);
        // Check if all required files are selected
        checkFilesSelected();
    });

});
