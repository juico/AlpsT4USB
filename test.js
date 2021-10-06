const HID_PRODUCT_ID_U1_DUAL      =0x120B;
const HID_PRODUCT_ID_T4_BTNLESS   =0x120C;
const HID_PRODUCT_ID_G1           =0x120D;
const HID_PRODUCT_ID_U1           =0x1209;
const HID_PRODUCT_ID_T4_USB       =0X1216;
const ALPS_VENDOR                 =0x44e;


const T4_INPUT_REPORT_LEN         =51;
const T4_FEATURE_REPORT_LEN       =T4_INPUT_REPORT_LEN;
const T4_FEATURE_REPORT_ID        =0x07;
const T4_CMD_REGISTER_READ        =0x08;
const T4_CMD_REGISTER_WRITE       =0x07;
const T4_INPUT_REPORT_ID          =0x09;

const T4_ADDRESS_BASE             =   0xC2C0;
const PRM_SYS_CONFIG_1            =(T4_ADDRESS_BASE + 0x0002);
const T4_PRM_FEED_CONFIG_1        =(T4_ADDRESS_BASE + 0x0004);
const T4_PRM_FEED_CONFIG_4        =(T4_ADDRESS_BASE + 0x001A);
const T4_PRM_ID_CONFIG_3          =(T4_ADDRESS_BASE + 0x00B0);

const T4_FEEDCFG4_ADVANCED_ABS_ENABLE=            0x01;
const T4_I2C_ABS                  =0x78;

const T4_COUNT_PER_ELECTRODE      =256;
const MAX_TOUCHES                 =5;

const U1_ABSOLUTE_REPORT_ID       =0x03; /* Absolute data ReportID */
const U1_FEATURE_REPORT_ID        =0x05; /* Feature ReportID */

const U1_FEATURE_REPORT_LEN       =0x08; /* Feature Report Length */
const U1_FEATURE_REPORT_LEN_ALL   =0x0A;
const U1_CMD_REGISTER_READ        =0xD1;
const U1_CMD_REGISTER_WRITE       =0xD2;

const U1_DISABLE_DEV              =0x01;
const U1_TP_ABS_MODE              =0x02;

const ADDRESS_U1_DEV_CTRL_1       =0x00800040;
const ADDRESS_U1_DEVICE_TYP       =0x00800043;
const ADDRESS_U1_NUM_SENS_X       =0x00800047;
const ADDRESS_U1_NUM_SENS_Y       =0x00800048;
const ADDRESS_U1_PITCH_SENS_X     =0x00800049;
const ADDRESS_U1_PITCH_SENS_Y     =0x0080004A;
const ADDRESS_U1_RESO_DWN_ABS     =0x0080004E;
const ADDRESS_U1_PAD_BTN          =0x00800052;

const filters = [
  {
    vendorId: ALPS_VENDOR, // Alps
    productId: HID_PRODUCT_ID_T4_BTNLESS // T4
  },
  {
    vendorId: ALPS_VENDOR, // Alps
    productId: HID_PRODUCT_ID_U1_DUAL // U1 
  }
];
let device;
let outputDiv;
let logDiv;
var start = async function(){
    [device] = await navigator.hid.requestDevice({ filters });
    device.open();
    outputDiv = document.getElementById("inputreport");
    logDiv = document.getElementById("log");
    return device;
}

function enable_report_listener(){
    device.addEventListener("inputreport", event => {
        const { data, device, reportId } = event;
        outputDiv.innerHTML = "ReportId: " +reportId + "<br/>";
        for(let i =0;i<data.byteLength;i++){
            outputDiv.innerHTML+=data.getInt8(i)+":";
        }
    });
}
function read_write_register(address, write_val,read_flag){
    if(device.productId == HID_PRODUCT_ID_T4_BTNLESS){
        t4_read_write_register(address,write_val,read_flag);
    };
    if(device.productId == HID_PRODUCT_ID_U1_DUAL){
        u1_read_write_register(address,write_val,read_flag);
    };
}
function t4_calc_check_sum(buffer, offset,length)
{
    sum1 = 0xFF, sum2 = 0xFF;
    i = 0;
    
    if (offset + length >= 50)
        return 0;
    
    while (length > 0) {
        tlen = length > 20 ? 20 : length;
        
        length -= tlen;
        
        do {
            sum1 += buffer[offset + i];
            sum2 += sum1;
            i++;
        } while (--tlen > 0);
        
        sum1 = (sum1 & 0xFF) + (sum1 >> 8);
        sum2 = (sum2 & 0xFF) + (sum2 >> 8);
    }
    
    sum1 = (sum1 & 0xFF) + (sum1 >> 8);
    sum2 = (sum2 & 0xFF) + (sum2 >> 8);
    
    return  [sum1,sum2];
}
function adress_convert(address_string){
    address = Number.parseInt(address_string);
    addr32= new Uint32Array(1)
    addr32[0]=address;
    return new Uint8Array(addr32.buffer);
}
function print_hex(uintarray){
    output = "";
    for(let i=0;i<uintarray.byteLength;i++){
        if(uintarray[i]>16){
             output+="0X"+uintarray[i].toString(16)+":";
        }
        else{
            output+="0X0"+uintarray[i].toString(16)+":";
        }
    }
    return output
}
async function t4_read_write_register( address,write_val, read_flag) {

    buffer = new ArrayBuffer(T4_FEATURE_REPORT_LEN);
    input= new Uint8Array(buffer);
    check_sum =0 ;
    //input[T4_FEATURE_REPORT_LEN] = {};
    //UInt8 readbuf[T4_FEATURE_REPORT_LEN] = {};
    //IOReturn ret = kIOReturnSuccess;
    
    input[0] = T4_FEATURE_REPORT_ID;

    if (read_flag) {

        input[1] = T4_CMD_REGISTER_READ;
        input[8] = 0x00;
    } else {

        input[1] = T4_CMD_REGISTER_WRITE;
        input[8] = Number.parseInt(write_val);
        //input[8] = write_val;
    }
    input.set(adress_convert(address),2);
    //input[2]=address[0];
    //input[3]=address[1];
    //input[4]=address[2];
    //input[5]=address[3];
    //put_unaligned_le32(address, input + 2);
    input[6] = 1;
    input[7] = 0;
    
    /* Calculate the checksum */
    check_sum = t4_calc_check_sum(input, 1, 8);
    input[9]=check_sum[0];
    input[10]=check_sum[1];
    //input.set(check_sum,9);
    //input[9] = (UInt8)check_sum;
    //input[10] = (UInt8)(check_sum >> 8);
    input[11] = 0;
    input = input.slice(1);
    logDiv.innerHTML += "<br/><br/>Send:";

    //for(let i=0;i<input.byteLength;i++){
    //    logDiv.innerHTML += "0X"+input[i].toString(16)+":";
    //}
    logDiv.innerHTML += print_hex(input);

    await device.sendFeatureReport(T4_FEATURE_REPORT_ID,input);

    //OSData* input_updated = OSData::withBytes(input, T4_FEATURE_REPORT_LEN);
    //IOBufferMemoryDescriptor* report = IOBufferMemoryDescriptor::withBytes(input_updated->getBytesNoCopy(0, T4_FEATURE_REPORT_LEN), input_updated->getLength(), kIODirectionInOut);
    
    //input_updated->release();
    
    //hid_interface->setReport(report, kIOHIDReportTypeFeature, T4_FEATURE_REPORT_ID);


    if (read_flag) {
        
        recieveData = await device.receiveFeatureReport(T4_FEATURE_REPORT_ID);
        //ret = hid_interface->getReport(report, kIOHIDReportTypeFeature, T4_FEATURE_REPORT_ID);
        //dump_report(report);
        //report->readBytes(0, &readbuf, T4_FEATURE_REPORT_LEN);
        //IOLog("Packet read:(%x:%x:%x:%x:%x:%x:%x:%x:%x:%x:%x:%x:%x:%x)", readbuf[0],readbuf[1],readbuf[2],readbuf[3],readbuf[4],readbuf[5],readbuf[6],readbuf[7],readbuf[8],readbuf[9],readbuf[10],readbuf[11],readbuf[12],readbuf[13]);
        //if (*(UInt32 *)&readbuf[6] != address) {
        //    IOLog("read register address error (%x,%x)\n", *(UInt32 *)&readbuf[6], address);
        //    goto exit_readbuf;
        //}
        
        //if (*(UInt16 *)&readbuf[10] != 1) {
        //    IOLog("read register size error (%x)\n", *(UInt16 *)&readbuf[10]);
        //    goto exit_readbuf;
        //}
        
        //check_sum = t4_calc_check_sum(readbuf, 6, 7);
        //if (*(UInt16 *)&readbuf[13] != check_sum) {
        //    IOLog("read register checksum error (%x,%x)\n", *(UInt16 *)&readbuf[13], check_sum);
        //    goto exit_readbuf;
        //}
        
        //*read_val = readbuf[12];
        logDiv.innerHTML += "<br/><br/>Read:";
        //for(let i=0;i<recieveData.byteLength;i++){
        //logDiv.innerHTML += "0X"+recieveData.getUint8(i).toString(16)+" : ";
        //}
        logDiv.innerHTML += print_hex(new Uint8Array(recieveData.buffer));
        return recieveData;
    }
    return true;
    
};

async function u1_read_write_register(address, write_val,read_flag)
{    
    let check_sum =0;
    buffer = new ArrayBuffer(U1_FEATURE_REPORT_LEN);
    input= new Uint8Array(buffer);
    
    input[0] = U1_FEATURE_REPORT_ID;
    if (read_flag) {
        input[1] = U1_CMD_REGISTER_READ;
        input[6] = 0x00;
    } else {
        input[1] = U1_CMD_REGISTER_WRITE;
        input[6] = Number.parseInt(write_val);
        //input[6] = write_val;
    }
    input.set(adress_convert(address),2);

    //put_unaligned_le32(address, input + 2);
    
    /* Calculate the checksum */
    check_sum = U1_FEATURE_REPORT_LEN_ALL;
    for (let i = 0; i < U1_FEATURE_REPORT_LEN - 1; i++)
        check_sum += input[i];
    
    input[7] = check_sum;
    input = input.slice(1);
    logDiv.innerHTML += "<br/><br/>Send:";

    logDiv.innerHTML += print_hex(input);


    device.sendFeatureReport(U1_FEATURE_REPORT_ID,input);
    /*
    OSData* input_updated = OSData::withBytes(input, U1_FEATURE_REPORT_LEN);
    IOBufferMemoryDescriptor* report = IOBufferMemoryDescriptor::withBytes(input_updated->getBytesNoCopy(0, U1_FEATURE_REPORT_LEN), input_updated->getLength(), kIODirectionInOut);
    input_updated->release();
    IOLog("%s::%s SetReport(%x,%x,%x,%x,%x,%x,%x,%x)\n", getName(), name,input[0],input[1],input[2],input[3],input[4],input[5],input[6],input[7]);

    ret = hid_interface->setReport(report, kIOHIDReportTypeFeature, U1_FEATURE_REPORT_ID);
    */
    if (read_flag) {
        recieveData = await device.receiveFeatureReport(U1_FEATURE_REPORT_ID);

        /*
        ret = hid_interface->getReport(report, kIOHIDReportTypeFeature, U1_FEATURE_REPORT_ID);
        
        report->readBytes(0, &readbuf, U1_FEATURE_REPORT_LEN);
        IOLog("%s::%s GetReport result:(%x,%x,%x,%x,%x,%x,%x,%x)\n", getName(), name,readbuf[0],readbuf[1],readbuf[2],readbuf[3],readbuf[4],readbuf[5],readbuf[6],readbuf[7]);
        
        *read_val = readbuf[6];
        IOLog("%s::%s Value read: %u on adress (%x)\n", getName(), name,readbuf[6],address);
        */
        logDiv.innerHTML += "<br/><br/>Read:";
        logDiv.innerHTML += print_hex(new Uint8Array(recieveData.buffer));
        return recieveData;
    }
    return true;
}