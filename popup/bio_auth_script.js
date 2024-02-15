
let methodInfo = "";
let methodCapture = "";
let finalUrl = '';
const getCustomDomName = "127.0.0.1";

async function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function discoverAvdm(startPort, endPort, port8005) {
    let devices = [];
    let final_result = {};
    for (let i = startPort; i <= endPort; i++) {
        //const primaryUrl = `http://${getCustomDomName}:`;
        //let successFlag = false;

        try {
            const protocol = window.location.href.includes("https") ? "https://" : "http://";
            finalUrl = protocol + getCustomDomName + ":" + i.toString();
        } catch (e) {}

        let cmbData1 = "";
        let cmbData2 = "";

        try {
            const response = await fetch(finalUrl, { method: "RDSERVICE", cache: "no-cache" });
            const data = await response.text();
            const $doc = new DOMParser().parseFromString(data, "text/xml");
            cmbData1 = $doc.querySelector('RDService').getAttribute('status');
            cmbData2 = $doc.querySelector('RDService').getAttribute('info');
            
            if ($doc.querySelector('Interface[path="/rd/capture"]')) {
                methodCapture = "/rd/capture";
            }

            if ($doc.querySelector('Interface[path="/rd/info"]')) {
                methodInfo = "/rd/info";
            }

            if (cmbData1 && cmbData2 && methodCapture && methodInfo) {
                //successFlag = true;
                let result = {};
                result = {
                    raw_xml: { httpStatus: true, data: data },
                    port: i.toString(),
                    status: cmbData1,
                    info: cmbData2,
                    methodCapture: methodCapture,
                    methodInfo: methodInfo
                };
                devices.push(result);
            }
        } catch (error) {
            final_result["error"] = error.status;
            // result = { httpStatus: false, err: error.status };
        }
    }
    final_result["devices"] = devices;
    return final_result;
}

async function deviceInfoAvdm(discoveryResult) {
    let res;
    const finalUrl = `http://${getCustomDomName}:${discoveryResult.port}${discoveryResult.methodInfo}`;

    try {
        const response = await fetch(finalUrl, { method: "DEVICEINFO", cache: "no-cache" });
        const data = await response.text();
        res = { httpStatus: true, data: data };
    } catch (error) {
        res = { httpStatus: false, err: error.status };
    }

    return res;
}

async function captureAvdm(discoveryResult, fCount=1, iCount=0, iType='', txtWithaadhar='', txtOtp='', txtClientKey='') {
    let result = {};
    const strWithaadhar = txtWithaadhar !== '' ? ` wadh="${txtWithaadhar}"` : '';
    const strOtp = txtOtp !== '' ? ` otp="${txtOtp}"` : '';

    const XML = `<?xml version="1.0"?>
        <PidOptions ver="1.0">
            <Opts fCount="${fCount}" fType="2" iCount="${iCount}" itpye="${iType}" pCount="0" pgCount="0"${strOtp} format="0" 
                  pidVer="2.0" timeout="20000" pTimeout=""${strWithaadhar} posh="UNKNOWN" env="P" />
            <CustOpts>
                <Param name="ValidationKey" value="${txtClientKey}" />
            </CustOpts>
    //     </PidOptions>`;

    const finalUrl = `http://${getCustomDomName}:${discoveryResult.port}${discoveryResult.methodCapture}`;

    try {
        const response = await fetch(finalUrl, {
            method: "CAPTURE",
            cache: "no-cache",
            headers: {
                "Content-Type": "text/xml; charset=utf-8"
            },
            body: XML
        });
        const data = await response.text();
        result = { httpStatus: true, data: data, xml:XML};
        const $doc = new DOMParser().parseFromString(data, "text/xml");
        const message = $doc.querySelector('Resp').getAttribute('errInfo');
        console.log(message);
    } catch (error) {
        result = { httpStatus: false, err: error.status };
        console.log(error);
    }
    return result;
}

async function globalCapture() {
    var button = document.getElementById('capture_button');
            button.disabled = true; // Disable the button
    const discoveryResult = await discoverAvdm(11100, 11105, 8005);
    console.log(discoveryResult);
    if(discoveryResult!==undefined && discoveryResult["error"] === undefined && discoveryResult["devices"] !== undefined && discoveryResult["devices"].length > 0)
    {
        let devices = discoveryResult["devices"];
        let ready_devices = [];
        let device_names = "";
        for(let i=0,j=0; i< devices.length; i++){
            let device = devices[i];
            if(device["status"] === 'READY'){
                ready_devices.push(device)
                device_names += (j++).toString()+". "+device["info"] +"\n";
            }
        }
        let device_index = 0;
        if(ready_devices.length > 1){
            device_index = prompt(`Which device?\n ${device_names}`);
            device_index = parseInt(device_index);
        }
        const deviceInfoResult = await deviceInfoAvdm(ready_devices[device_index]);
        console.log("device Info Result:", deviceInfoResult);
        let selected_device = ready_devices[device_index];
        let fCount = 1, iCount = 0, iType = '';         
        if(selected_device["info"].includes("Iris")){
            fCount = 0, iCount = 1, iType = 'ISO';  
        }
        const captureResult = await captureAvdm(selected_device,fCount,iCount,iType);
        console.log("capture Result:", captureResult);

         // Populate textarea fields
        document.getElementById('device_info').value = deviceInfoResult.data;
        document.getElementById('Pid Options').value = captureResult.xml;
        document.getElementById('Pid Data').value = captureResult.data;

    }else{
        console.log("Connection Failed")
    }
    button.disabled = false; // enable the button
}
