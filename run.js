document.addEventListener('DOMContentLoaded', function () {

    // Existing code...
    function filterConnectorRouteArray(){
        window.ConnectorRouteArray = window.ConnectorRouteArray.filter(item => item.connector === window.MT5ConfigObject.ActiveConnector);
    }



    function matchPattern(group, patterns) {
        return patterns.some(pattern => {
            // Escape special characters except '*'
            // Convert '*' to '.*' to match any sequence of characters
            const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return regexPattern.test(group);
        });
    }
    
    

    // Function to enrich MT5 positions
    function enrichMT5Positions() {
        if (!window.aggregatedArray.length || !window.MT5TradingAccountsArray.length) {
            console.error('aggregatedArray or MT5TradingAccountsArray is empty');
            return;
        }

        window.aggregatedArray.forEach(position => {
            const account = window.MT5TradingAccountsArray.find(acc => acc.Login === position.Login);
            if (account) {
                position.Group = account.Group;
                position.Name = account.Name;
            }
        });
    }

    // Function to filter MT5 positions based on excluded groups
    function filterExcludedGroups() {
        if (!window.aggregatedArray.length || !window.MT5ConfigObject || !window.MT5ConfigObject.ExcludedGroups) {
            
            console.error('aggregatedArray, groupObject, or ExcludedGroups is missing');
            return;
        }

        const excludedPatterns = window.MT5ConfigObject.ExcludedGroups;
        window.aggregatedArray = window.aggregatedArray.filter(position => {
            return !matchPattern(position.Group, excludedPatterns);
        });
    }

    function filterTestLogins() {
        if (!window.aggregatedArray.length) {
            return;
        }
    
        const excludedLogins = ['TEST']; // These can be made case-insensitive later
    
        window.aggregatedArray = window.aggregatedArray.filter(position => {
            return !excludedLogins.some(excluded => position.Name.toLowerCase().includes(excluded.toLowerCase()));
        });
    }

    function routeAggregatedArray() {
        if (window.ConnectorRouteArray.length > 0) {
            window.aggregatedArray.forEach(position => {
                window.ConnectorRouteArray.forEach(route => {
                    if(route.sym === position.Symbol){
                        position.BBOOK = "NO"
                        position.BbookRatio = window.MT5ConfigObject.BbookRatio[route.target];
                        position.RiskAccount = window.MT5ConfigObject.RiskAccounts[route.target];
                    };
                });
            });
    
            window.aggregatedArray.forEach(position => {
                window.ConnectorRouteArray.forEach(route => {
                    if(route.subid3 === position.Login){
                        position.BBOOK = "NO";
                        if(!position.RiskAccount){position.RiskAccount = window.MT5ConfigObject.RiskAccounts[route.target];}
                        if(!position.BbookRatio){position.BbookRatio = window.MT5ConfigObject.BbookRatio[route.target];}
                    }
                });
            })

            window.aggregatedArray.forEach(position => {
                if (!position.BBOOK) {
                    position.BBOOK = "YES";
                }
                if (!position.RiskAccount) {
                    position.RiskAccount = "DAMAN_DEALER";
                }
                if (position.BbookRatio === undefined || position.BbookRatio === null) {
                    position.BbookRatio = 1; // Only executes if BbookRatio is truly missing
                }
            });
        }
    }

    function adjustAggregatedVolumes() {
        if (!window.aggregatedArray.length || !window.MT5ConfigObject || !window.MT5ConfigObject.Symbols) {
            console.error('aggregatedArray or MT5ConfigObject.Symbols is missing');
            return;
        }
    
        window.aggregatedArray.forEach(position => {
            const symbolConfig = window.MT5ConfigObject.Symbols.find(symbol => {
                // Create regex for wildcard matching
                const regexPattern = new RegExp('^' + symbol.Symbol.replace(/\*/g, '.*') + '$');
                return regexPattern.test(position.Symbol);
            });
    
            if (symbolConfig) {
                // Multiply volume by contract size
                position.Volume *= symbolConfig.ContractSize;
            }
        });
    
        
    }

    function adjustAggregatedBbookVolume() {
        window.aggregatedArray.forEach(element => {
            if (element.Volume != null && element.BbookRatio != null) {
                element.BbookVolume = element.Volume * element.BbookRatio;
            } else {
                console.warn(`Element is missing Volume or BbookRatio:`, element);
                element.BbookVolume = null; // Set to null if calculation cannot be performed
            }
        });
    }


    function netFullBook() {
        window.aggregatedArray.forEach(position => {
            // Find the existing entry for the symbol in netFullBookArray
            let entry = window.netFullBookArray.find(item => item.Symbol === position.Symbol);
            
            // If no entry is found, create a new one
            if (!entry) {
                entry = { Symbol: position.Symbol, NetVolume: 0 };
                window.netFullBookArray.push(entry);
            }
            
            // Add volume to the net volume (volume sign is preserved)
            entry.NetVolume += position.Volume;
        });
        netFullBookArray.forEach(item => {
            item.NetVolume = Math.round(item.NetVolume * 100) / 100;
        });
    }

    function netBBook() {
        if (window.ConnectorRouteArray.length > 0) {
        // Iterate through aggregatedArray
            window.aggregatedArray.forEach(position => {
                // Only process positions with BBOOK property set to YES
                if (position.BBOOK === "YES") {
                    // Find the existing entry for the symbol in netBBookArray
                    let entry = window.netBBookArray.find(item => item.Symbol === position.Symbol);
                    
                    // If no entry is found, create a new one
                    if (!entry) {
                        entry = { Symbol: position.Symbol, NetVolume: 0 };
                        window.netBBookArray.push(entry);
                    }
                    
                    // Add volume to the net volume (volume sign is preserved)
                    entry.NetVolume += position.Volume;
                }
            });
    
        // Round each volume to the second decimal place
            window.netBBookArray.forEach(item => {
                item.NetVolume = Math.round(item.NetVolume * 100) / 100;
            });
        }
    }

    function netBbook2(){
        window.aggregatedArray.forEach(position =>{
            let entry = window.netBBookArray2.find(item => item.Symbol === position.Symbol&&item.RiskAccount === position.RiskAccount);

            // If no entry is found, create a new one
            if (!entry) {
                entry = { Symbol: position.Symbol, NetVolume: 0, RiskAccount:position.RiskAccount };
                window.netBBookArray2.push(entry);
        }

        // Add volume to the net volume (volume sign is preserved)
        entry.NetVolume += position.BbookVolume;
    })
        // Round each volume to the second decimal place
        window.netBBookArray2.forEach(item => {
            item.NetVolume = Math.round(item.NetVolume * 100) / 100;
        });
    }

    function hideFirstDiv() {
        // Get the element with the ID 'firstdiv'
        const element = document.getElementById('firstdiv');
        
        // Check if the element exists before attempting to hide it
        element.style.display = 'none';
        
    }

    function FullBookCrossCheck() {
        // Iterate over NetFullBookArray
        window.netFullBookArray.forEach(item => {
            // Push symbol and MT5Volume to FullBookCrossCheckArray
            window.fullBookCrossCheckArray.push({
                Symbol: item.Symbol,
                MT5Volume: item.NetVolume
            });
        });

        window.PrimeXMPositionsArray.forEach(PXMPosition => {
            // Check if the Account value matches MT5ConfigObject.FullBook
            if (PXMPosition.Account === window.MT5ConfigObject.FullBook) {
                // Find the matching element in FullBookCrossCheckArray
                const existingEntry = window.fullBookCrossCheckArray.find(entry => entry.Symbol === PXMPosition.Symbol);
    
                // If an entry with the same symbol is found, update its PXMVolume
                if (existingEntry) {
                    existingEntry.PXMVolume = PXMPosition.Base;
                } else {
                    // If no entry is found, create a new one
                    window.fullBookCrossCheckArray.push({
                        Symbol: PXMPosition.Symbol,
                        PXMVolume: PXMPosition.Base
                    });
                }
            }
        });
    }

    function BBookCrossCheck() {
        if (window.ConnectorRouteArray.length > 0) {
            // Iterate over netBBookArray
            window.netBBookArray.forEach(item => {
                // Push symbol and NetVolume to BBookCrossCheckArray
                window.BBookCrossCheckArray.push({
                    Symbol: item.Symbol,
                    MT5Volume: item.NetVolume
                });
            });
        
            window.PrimeXMPositionsArray.forEach(PXMPosition => {
                // Check if the Account value matches MT5ConfigObject.BBook
                if (PXMPosition.Account === window.MT5ConfigObject.BBook) {
                    // Find the matching element in BBookCrossCheckArray
                    const existingEntry = window.BBookCrossCheckArray.find(entry => entry.Symbol === PXMPosition.Symbol);
        
                    // If an entry with the same symbol is found, update its PXMVolume
                    if (existingEntry) {
                        existingEntry.PXMVolume = PXMPosition.Base;
                        existingEntry.PXMOverflow = PXMPosition.Overflow;
                    } else {
                        // If no entry is found, create a new one
                        window.BBookCrossCheckArray.push({
                            Symbol: PXMPosition.Symbol,
                            PXMVolume: PXMPosition.Base,
                            PXMOverflow: PXMPosition.Overflow
                        });
                    }
                }
            });
        }
    }





    function BBookCrossCheck2() {
        if (window.ConnectorRouteArray.length > 0) {
            // Iterate over netBBookArray
            window.netBBookArray2.forEach(item => {
                // Push symbol and NetVolume to BBookCrossCheckArray
                window.BBookCrossCheckArray2.push({
                    Symbol: item.Symbol,
                    MT5Volume: item.NetVolume,
                    RiskAccount: item.RiskAccount
                });
            });
        
            window.PrimeXMPositionsArray.forEach(PXMPosition => {

                    // Find the matching element in BBookCrossCheckArray
                    const existingEntry = window.BBookCrossCheckArray2.find(entry => entry.Symbol === PXMPosition.Symbol&&entry.RiskAccount === PXMPosition.Account);
        
                    // If an entry with the same symbol and same risk account is found, update its PXMVolume
                    if (existingEntry) {
                        existingEntry.PXMVolume = PXMPosition.Base;
                        existingEntry.PXMOverflow = PXMPosition.Overflow;
                    } else {
                        // If no entry is found, create a new one
                        window.BBookCrossCheckArray2.push({
                            Symbol: PXMPosition.Symbol,
                            PXMVolume: PXMPosition.Base,
                            PXMOverflow: PXMPosition.Overflow,
                            RiskAccount: PXMPosition.Account
                        });
                    }
                
            });
        }
    }





















    
    
    function createFullBookCrossCheckTable() {
        let tableContainer = document.getElementById('table-container-2');
    
        // Create table element
        const table = document.createElement('table');
        table.setAttribute('border', '1');
    
        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = "BOOK"
        headerRow.appendChild(th);
        ['Symbol', 'MT5Volume', 'PXMVolume'].forEach(header => {
            const th = document.createElement('th');
            th.textContent = header; // Use header text
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
    
        // Create table body
        const tbody = document.createElement('tbody');
        fullBookCrossCheckArray.forEach(item => {
            const tr = document.createElement('tr');
            if(item.MT5Volume!=item.PXMVolume){tr.style.backgroundColor = "red"}

            const td = document.createElement('td');
            td.textContent = MT5ConfigObject.FullBook || ''; // Add cell value or empty if not available
            tr.appendChild(td);

            ['Symbol', 'MT5Volume', 'PXMVolume'].forEach(field => {
                const td = document.createElement('td');
                td.textContent = item[field] || ''; // Add cell value or empty if not available
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
    
        // Append the table to the container
      
        // Check if the wrapper exists
        let wrapper = tableContainer.querySelector('.table-wrapper-2');
        if (!wrapper) {
            // Create a wrapper if it doesn't exist
            wrapper = document.createElement('div');
            wrapper.className = 'table-wrapper-2';
            tableContainer.appendChild(wrapper);
        }
        // Append the table to the wrapper
        wrapper.appendChild(table);
        
    }

    function createBBookCrossCheckTable() {
        if (window.ConnectorRouteArray.length > 0) {
            let tableContainer = document.getElementById('table-container-2');
        
            // Create table element
            const table = document.createElement('table');
            table.setAttribute('border', '1');
        
            // Create table header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            const th = document.createElement('th');
            th.textContent = "BOOK"
            headerRow.appendChild(th);
            ['Symbol', 'MT5Volume', 'PXMVolume', 'PXMOverflow'].forEach(header => {
                const th = document.createElement('th');
                th.textContent = header; // Use header text
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);
        
            // Create table body
            const tbody = document.createElement('tbody');
            BBookCrossCheckArray.forEach(item => {
                const tr = document.createElement('tr');
                if(item.MT5Volume!=item.PXMVolume * -1){
                    if(item.MT5Volume===(item.PXMVolume+item.PXMOverflow)*-1){
                        tr.style.backgroundColor = "orange";
                    } else {
                        tr.style.backgroundColor = "red"}}

                const td = document.createElement('td');
                td.textContent = MT5ConfigObject.BBook || ''; // Add cell value or empty if not available
                tr.appendChild(td);

                ['Symbol', 'MT5Volume', 'PXMVolume','PXMOverflow'].forEach(field => {
                    const td = document.createElement('td');
                    td.textContent = item[field] || ''; // Add cell value or empty if not available
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
        
            // Append the table to the container
            
            // Check if the wrapper exists
            let wrapper = tableContainer.querySelector('.table-wrapper-2');
            if (!wrapper) {
                // Create a wrapper if it doesn't exist
                wrapper = document.createElement('div');
                wrapper.className = 'table-wrapper-2';
                tableContainer.appendChild(wrapper);
            }
            // Append the table to the wrapper
            wrapper.appendChild(table);
            
        }
    }


        function createBBookCrossCheckTable_1() {
        if (window.ConnectorRouteArray.length > 0) {
            let tableContainer = document.getElementById('table-container-2');
        
            // Create table element
            const table = document.createElement('table');
            table.setAttribute('border', '1');
        
            // Create table header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            const th = document.createElement('th');
            th.textContent = "BOOK"
            headerRow.appendChild(th);
            ['Symbol', 'MT5Volume', 'PXMVolume', 'PXMOverflow'].forEach(header => {
                const th = document.createElement('th');
                th.textContent = header; // Use header text
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);
        
            // Create table body
            const tbody = document.createElement('tbody');
            BBookCrossCheckArray2.forEach(item => {
                if(item.RiskAccount === window.MT5ConfigObject.RiskAccounts2[0]) {
                    const tr = document.createElement('tr');
                    if(item.MT5Volume!=item.PXMVolume * -1){
                        if(item.MT5Volume===(item.PXMVolume+item.PXMOverflow)*-1){
                            tr.style.backgroundColor = "orange";
                        } else {
                            tr.style.backgroundColor = "red"}}
    
                    const td = document.createElement('td');
                    td.textContent = window.MT5ConfigObject.RiskAccounts2[0] || ''; // Add cell value or empty if not available
                    tr.appendChild(td);
    
                    ['Symbol', 'MT5Volume', 'PXMVolume','PXMOverflow'].forEach(field => {
                        const td = document.createElement('td');
                        td.textContent = item[field] || ''; // Add cell value or empty if not available
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                }
            });
            table.appendChild(tbody);
        
            // Append the table to the container
            
            // Check if the wrapper exists
            let wrapper = tableContainer.querySelector('.table-wrapper-2');
            if (!wrapper) {
                // Create a wrapper if it doesn't exist
                wrapper = document.createElement('div');
                wrapper.className = 'table-wrapper-2';
                tableContainer.appendChild(wrapper);
            }
            // Append the table to the wrapper
            wrapper.appendChild(table);
            
        }
    }
    

    function createBBookCrossCheckTable_2() {
        if (window.ConnectorRouteArray.length > 0) {
            let tableContainer = document.getElementById('table-container-2');
        
            // Create table element
            const table = document.createElement('table');
            table.setAttribute('border', '1');
        
            // Create table header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            const th = document.createElement('th');
            th.textContent = "BOOK"
            headerRow.appendChild(th);
            ['Symbol', 'MT5Volume', 'PXMVolume', 'PXMOverflow'].forEach(header => {
                const th = document.createElement('th');
                th.textContent = header; // Use header text
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);
        
            // Create table body
            const tbody = document.createElement('tbody');
            BBookCrossCheckArray2.forEach(item => {
                if(item.RiskAccount === window.MT5ConfigObject.RiskAccounts2[1]) {
                    const tr = document.createElement('tr');
                    if(item.MT5Volume!=item.PXMVolume * -1){
                        if(item.MT5Volume===(item.PXMVolume+item.PXMOverflow)*-1){
                            tr.style.backgroundColor = "orange";
                        } else {
                            tr.style.backgroundColor = "red"}}
    
                    const td = document.createElement('td');
                    td.textContent = window.MT5ConfigObject.RiskAccounts2[1] || ''; // Add cell value or empty if not available
                    tr.appendChild(td);
    
                    ['Symbol', 'MT5Volume', 'PXMVolume','PXMOverflow'].forEach(field => {
                        const td = document.createElement('td');
                        td.textContent = item[field] || ''; // Add cell value or empty if not available
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                }
            });
            table.appendChild(tbody);
        
            // Append the table to the container
            
            // Check if the wrapper exists
            let wrapper = tableContainer.querySelector('.table-wrapper-2');
            if (!wrapper) {
                // Create a wrapper if it doesn't exist
                wrapper = document.createElement('div');
                wrapper.className = 'table-wrapper-2';
                tableContainer.appendChild(wrapper);
            }
            // Append the table to the wrapper
            wrapper.appendChild(table);
            
        }
    }

    document.getElementById('runButton').addEventListener('click', function() {
        //This filters out DAMAN2 and DAMAN3 connectors from connectorroute export
        filterConnectorRouteArray();
        //This adds group and name information to aggregated array
        enrichMT5Positions();
        console.log("Aggregated Array Data after enrich function:", window.aggregatedArray);
        //These filter excluded groups and logins with Test in their names
        filterExcludedGroups();
        filterTestLogins();
        console.log("Aggregated Array Data after filtering excluded groups and tests:", window.aggregatedArray);
        //This function has 3 parts, first it is comparing position symbol agaist connector route symbols, if it is matching it makes bbook no, and sets the risk account STP and bbook ratio 0 by finding target connector account in config file
        //In the second part, it does the same thing by comparing login numbers
        //In the 3rd part, if the bbook value is not set to anything, which means position couldnt be matched in the connector route, DAMAN_DEALER risk account is assigned.
        routeAggregatedArray();
        console.log("Aggregated Array Data after route aggregated array:", window.aggregatedArray);
        adjustAggregatedVolumes();
        adjustAggregatedBbookVolume()
        console.log("Adjusted Aggregated Array Data:", window.aggregatedArray);
        netFullBook();
        netBBook();
        netBbook2();
        hideFirstDiv()
        FullBookCrossCheck();
        BBookCrossCheck();
        BBookCrossCheck2();
        console.log("BBookCrossCheckArray2:",window.BBookCrossCheckArray2)
        createFullBookCrossCheckTable();
        createBBookCrossCheckTable_1();
        createBBookCrossCheckTable_2();
    });
});
