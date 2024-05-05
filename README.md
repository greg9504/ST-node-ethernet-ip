<p align="center"><img width="280" src="https://i.imgur.com/HNxhZox.png" alt="Vue logo"></p>

# Node Ethernet/IP

A simple and lightweight node based API for interfacing with Rockwell Control/CompactLogix PLCs and Ethernet/IP I/O.

## Prerequisites

latest version of [NodeJS](https://nodejs.org/en/)

## Getting Started

Install with npm

```
npm install st-ethernet-ip --save
```
## The API

How the heck does this thing work anyway? Great question!

### The Basics - New And Improved (less mess)

#### Using Comnnection Manager

```javascript
//Connection Manager automagically reconnects to controller that have lost connection. Scanner auto initiated.

const {ControllerManager} = require('st-ethernet-ip')

const cm = new ControllerManager();

//addController(ipAddress, slot = 0, rpi = 100, connected = true, retrySP = 3000, opts = {})
const cont = cm.addController('192.168.86.200');

cont.connect();

//addTag(tagname, program = null, arrayDims = 0, arraySize = 0x01)
cont.addTag('TheInteger')

cont.on('TagChanged', (tag, prevValue) => {
  console.log(tag.name, ' changed from ', prevValue, ' => ', tag.value)
})

cont.on('error', (e) => {
  console.log(e)
})
```

### Arrays / UDTs

```javascript
const {Controller} = require('st-ethernet-ip')

const PLC = new Controller();

//A taglist and structure templates are automatically retrieved after connected
PLC.connect("192.168.86.200", 0).then(async () => {

    // String UDT
    const tag2 = PLC.newTag('testString')

    // An array of strings with 1 dimension (only 1 currently supported)
    const tag3 = PLC.newTag('stringArray', null, true, 1)

    // A custom UDT tag
    const tag4 = PLC.newTag('bigUDT')
    
    // Automatically determine the size of the array and store in tag
    await PLC.getTagArraySize(tag3)
    
    // Read tags
    await PLC.readTag(tag2)
    await PLC.readTag(tag3)
    await PLC.readTag(tag4)


    // Display tag as a javascript object
    console.log(tag2.value)
    console.log(tag3.value)
    console.log(tag4.value)

    //modify string value
    tag2.value = 'Hello World!'

    //modify an array of string values
    tag3.value[19] = 'The End'
    
    //set value of member of a UDT called 'Struct1' which is an array of booleans
    tag4.value.Struct1[3] = true;

    //set value of member of a UDT called 'VAR2_STRING' which is an array of another UDT member called 'Group1'
    tag4.value.Group1[2].VAR2_STRING = 'What Do You Mean?'
    
    //Write the tag values
    await PLC.writeTag(tag2)
    await PLC.writeTag(tag3)
    await PLC.writeTag(tag4)
    
}).catch(async e => {
    console.log(e)
});
```

### The Basics - Old School

#### Getting Connected

```javascript
const { Controller } = require("ethernet-ip");

const PLC = new Controller();

// Controller.connect(IP_ADDR[, SLOT])
// NOTE: SLOT = 0 (default) - 0 if CompactLogix
PLC.connect("192.168.1.1", 0).then(() => {
    console.log(PLC.properties);
});
```

Controller.properties Object
```javascript
 {
    name: String, // eg "1756-L83E/B"
    serial_number: Number, 
    slot: Number,
    time: Date, // last read controller WallClock datetime
    path: Buffer,
    version: String, // eg "30.11"
    status: Number,
    faulted: Boolean,  // will be true if any of the below are true
    minorRecoverableFault: Boolean,
    minorUnrecoverableFault: Boolean,
    majorRecoverableFault: Boolean,
    majorUnrecoverableFault: Boolean,
    io_faulted: Boolean
}
```

#### Set the Clock of the Controller

**NOTE** `Controller.prototype.readWallClock` and `Controller.prototype.writeWallClock` are experimental features and may not be available on all controllers. 1756-L8 ControlLogix Controllers are currently the only PLCs supporting these features.

Sync Controller WallClock to PC Datetime

```javascript
const { Controller } = require("ethernet-ip");

const PLC = new Controller();

PLC.connect("192.168.1.1", 0).then(async () => {
    // Accepts a JS Date Type
    // Controller.writeWallClock([Date])
    await PLC.writeWallClock(); // Defaults to 'new Date()'
});
```

Set Controller WallClock to a Specific Date

```javascript
const { Controller } = require("ethernet-ip");

const PLC = new Controller();

PLC.connect("192.168.1.1", 0).then(async () => {
    const partyLikeIts1999 = new Date('December 17, 1999 03:24:00');
    await PLC.writeWallClock(partyLikeIts1999); // Pass a custom Datetime
});
```

#### Reading Tags

**NOTE:** Currently, the `Tag` Class only supports *Atomic* datatypes (SINT, INT, DINT, REAL, BOOL). Not to worry, support for STRING, ARRAY, and UDTs are in the plans and coming soon! =]

Reading Tags `Individually`...
```javascript
const { Controller, Tag } = require("ethernet-ip");

const PLC = new Controller();

// Create Tag Instances
const fooTag = new Tag("contTag"); // Controller Scope Tag
const barTag = new Tag("progTag", "prog"); // Program Scope Tag in PLC Program "prog"

PLC.connect("192.168.1.1", 0).then(async () => {
    await PLC.readTag(fooTag);
    await PLC.readTag(barTag);

    console.log(fooTag.value);
    console.log(barTag.value);
});
```

Additional Tag Name Examples ...
```javascript
const fooTag = new Tag("Program:prog.progTag"); // Alternative Syntax for Program Scope Tag in PLC Program "prog"
const barTag = new Tag("arrayTag[0]"); // Array Element
const bazTag = new Tag("arrayTag[0,1,2]"); // Multi Dim Array Element
const quxTag = new Tag("integerTag.0"); // SINT, INT, or DINT Bit
const quuxTag = new Tag("udtTag.Member1"); // UDT Tag Atomic Member
const quuzTag = new Tag("boolArray[0]", null, BIT_STRING); // bool array tag MUST have the data type "BIT_STRING" passed in
```

Reading Tags as a `Group`...
```javascript
const { Controller, Tag, TagGroup } = require("ethernet-ip");

const PLC = new Controller();
const group = new TagGroup();

// Add some tags to group
group.add(new Tag("contTag")); // Controller Scope Tag
group.add(new Tag("progTag", "prog")); // Program Scope Tag in PLC Program "prog"

PLC.connect("192.168.1.1", 0).then(async () => {
    await PLC.readTagGroup(group);

    // log the values to the console
    group.forEach(tag => {
        console.log(tag.value);
    });
});
```

#### Writing Tags

**NOTE:** You *MUST* read the tags first or manually provide a valid CIP datatype. The following examples are taking the latter approach.

Writing Tags `Individually`...
```javascript
const { Controller, Tag, EthernetIP } = require("ethernet-ip");
const { DINT, BOOL } = EthernetIP.CIP.DataTypes.Types;

const PLC = new Controller();

// Create Tag Instances
const fooTag = new Tag("contTag", null, DINT); // Controller Scope Tag
const barTag = new Tag("progTag", "prog", BOOL); // Program Scope Tag in PLC Program "prog"

PLC.connect("192.168.1.1", 0).then(async () => {

    // First way to write a new value
    fooTag.value = 75;
    await PLC.writeTag(fooTag);

    // Second way to write a new value
    await PLC.writeTag(barTag, true);

    console.log(fooTag.value);
    console.log(barTag.value);
});
```

Writing Tags as a `Group`...
```javascript
const { Controller, Tag, TagGroup, EthernetIP } = require("ethernet-ip");
const { DINT, BOOL } = EthernetIP.CIP.DataTypes.Types;

const PLC = new Controller();
const group = new TagGroup();

// Create Tag Instances
const fooTag = new Tag("contTag", null, DINT); // Controller Scope Tag
const barTag = new Tag("progTag", "prog", BOOL); // Program Scope Tag in PLC Program "prog"

group.add(fooTag); // Controller Scope Tag
group.add(barTag); // Program Scope Tag in PLC Program "prog"

PLC.connect("192.168.1.1", 0).then(async () => {
    // Set new values
    fooTag.value = 75;
    barTag.value = true;

    // Will only write tags whose Tag.controller_tag !== Tag.value
    await PLC.writeTagGroup(group);

    group.forEach(tag => {
        console.log(tag.value);
    });
});
```
### Lets Get Fancy
#### Subscribing to Controller Tags

```javascript
const { Controller, Tag } = require("ethernet-ip");

const PLC = new Controller();

// Add some tags to group
PLC.subscribe(new Tag("contTag")); // Controller Scope Tag
PLC.subscribe(new Tag("progTag", "prog")); // Program Scope Tag in PLC Program "prog"

PLC.connect("192.168.1.1", 0).then(() => {
    // Set Scan Rate of Subscription Group to 50 ms (defaults to 200 ms)
    PLC.scan_rate = 50;

    // Begin Scanning
    PLC.scan();
});

// Catch the Tag "Changed" and "Initialized" Events
PLC.forEach(tag => {
    // Called on the First Successful Read from the Controller
    tag.on("Initialized", tag => {
        console.log("Initialized", tag.value);
    });

    // Called if Tag.controller_value changes
    tag.on("Changed", (tag, oldValue) => {
        console.log("Changed:", tag.value);
    });
});
```
### Newest Capabilities

#### New Integrated Tag/Structure into Controller 

```javascript
const {Controller} = require('st-ethernet-ip');

const PLC = new Controller()

PLC.connect('192.168.86.200', 0).then(async () => {
    
    //Display controller tag list
    console.log(PLC.tagList)

    //Add controller scope atomic tag 'Integer3'
    const tag = PLC.newTag('Integer3')

    //Add program 'MainProgram2' scope structure tag 'UDT_INST1'
    const tag2 = PLC.newTag('UDT_INST1', 'MainProgram2')

    //Read each tag
    await PLC.readTag(tag)
    await PLC.readTag(tag2)

    //Display values
    console.log(tag.value)
    console.log(tag2.value)

    //Change structure member 'VAR2_STRING' value
    tag2.value.VAR2_STRING = "Hello World!"

    //Write new tag value to PLC
    await PLC.writeTag(tag2)

    //Scan for changes in values in PLC or modified local values and updates at a rate of every 50mS
    PLC.scan_rate = 50;
    PLC.scan();


    PLC.forEach(tag => {
    // Called if Tag.controller_value changes
    tag.on("Changed", (tag, oldValue) => {
        console.log("FROM:", oldValue)
        console.log("TO:", tag.value);
    });
  });
}).catch(err => {
  console.log(err)
})

```

#### Getting a List of Available Controller Tags and Structure Templates

```javascript
const { Controller, TagList } = require("st-ethernet-ip");

const PLC = new Controller();

const tagList = new TagList();

PLC.connect("192.168.1.1", 0).then(async () => {
    
    // Get all controller tags and program tags
    await PLC.getControllerTagList(tagList)

    // Displays all tags
    console.log(tagList.tags)

    // Displays all templates
    console.log(tagList.templates)

    // Displays program names
    console.log(tagList.programs)

    
});
```

TagList.tags[] Object
```javascript
 {
    id: Number, // Instance ID
    program: String, // Name of program scope of tag. {Null} is controller scope
    type {
        typeCode: Number, // Data type code
        typeName: String, // Data type name
        structure: Boolean, // TRUE if is structure.
        arrayDims: Number, // Number of dimmensions of array. If not array = 0
        reserved: Boolean // TRUE if is reserved
    }
}
```

#### Reading/Writing LINT - Node.js >= 12.0.0

```javascript
const { Controller, Tag } = require("st-ethernet-ip");

const PLC = new Controller();

const tag = new Tag('BigInteger1');

PLC.connect("192.168.1.1", 0).then(async () => {
    
    // Read LINT
    await PLC.readTag(tag)

    // Displays all tags
    console.log(tag.value)  // output: 123456789n

    //Big Number Maths
    tag.value = tag.value + 1n // add 1 
    console.log(tag.value) // output: 123456790n 
    
    //Write new Big Number to 
    await PLC.writeTag(tag)

    
});
```

#### Reading/Writing Strings

```javascript
const { Controller, Tag, TagList, Structure } = require("st-ethernet-ip");

const PLC = new Controller();

PLC.connect("192.168.1.1", 0).then(async () => {
    
    const tagList = new TagList();
    await PLC.getControllerTagList(tagList);

    const stringStructure = new Structure('String1', tagList, {Optional Program Name});
    await PLC.readTag(stringStructure);

    console.log(stringStructure.value);

    stringStructure.value = "New String Value";
    await PLC.writeTag(stringStructure)
    
});
```
#### Reading/Writing Structures

```javascript
const { Controller, Tag, TagList, Structure } = require("st-ethernet-ip");

const PLC = new Controller();

PLC.connect("192.168.1.1", 0).then(async () => {
    
    const tagList = new TagList();
    await PLC.getControllerTagList(tagList);

    //Setup 'Structure1' Tag
    const structure1 = new Structure('Structure1', tagList, {Optional Program Name});
    
    //Read value from PLC
    await PLC.readTag(structure1);

    //Display entire structure
    console.log(structure1.value);

    //Change value of structure member
    structure1.value.Integer1 = 3;

    //Write Changes to PLC
    await PLC.writeTag(stringStructure)
    
});
```

#### Using unconnected messaging with custom timeout

```javascript
const { Controller, Tag, TagList, Structure } = require("st-ethernet-ip");

const PLC = new Controller(false, { unconnectedSendTimeout: 5064 });

PLC.connect("192.168.1.1", 0).then(async () => {
    
    const sampleTag = new Tag("sampleTag");

    await PLC.readTag(sampleTag);
    console.log(sampleTag.value);
});
```

### New Device Browser

#### Find Devices On The Network

`Uses the same method as RsLinx to detect if device is on the network`

```javascript
const { Browser } = require("st-ethernet-ip");

const browser = new Browser();

//When new device is detected
browser.on("New Device", device => {
    //Display all device info
    console.log(device);
    //Display Device IP address
    console.log(device.socketAddress.sin_addr);
    //Display Device Description
    console.log(device.productName)
});

//when device is not detected after x amount of scans
browser.on("Device Disconnected", device => {
    // 'device' is the disconnected device
})
```
### getAttributeSingle/setAttributeSingle
`Read and Write to Explicit generic ethernet/ip`
```typescript
import { ControllerManager, TagList, IO, Tag, Controller } from "st-ethernet-ip";
async function main() {
const PLC = new Controller();
// connect to the SEW VFD, do not do setup, while the VFD supports 
// Identity Class 0x01 (readControllerProps), it does not support
// Class 0x6b for tags (getControllerTagList)
PLC.connect("192.168.1.159", 0,false).then(async () => {
    // write process output data, there are 3 words, PO1/PO2/PO3
    // example configuration on the VFD:
    // PO1 = Control Word (direction of rotation, control command, param set, etc) (0x0005)
    // PO2 = Setpoint Speed (rpm of motor) (6000 rpm, encoded as 6000/0.2 = 30000 = 0x7530)
    // PO3 = Unassigned (set to 0x0000)
    const buf = Buffer.from("050030750000", 'hex');
    await PLC.setAttributeSingle(0x04,120, 3, buf );// class 0x04 Assembly Object, Instance 120 (decimal) output process data, attribute 3
    console.log('wrote PO data');
    // read the process input data, that is the actual values of the drive
    // example configuration
    // PI1 = Status Word
    // PI2 = Actual Speed
    // PI3 = Output Current
    const value = await PLC.getAttributeSingle(0x04, 130, 3);// class 0x04 Assembly Object, Instance 130 (decimal) input process data, attribute 3
    console.log('Got actual values from VFD: ' + value.toString('hex'));
    //SEW drive alays returns 10 words, we only care about the first 3

    //now read a parameter setting, this is done using the Register Object class 0.07
    //data needs to be passed in the getAttributeSingle call to identify which parameter
    //is to be read
    // read parameter 006 Motor Utilization, parameter index is 0x2083
    const paraBuf = Buffer.from("832000000000000000000000", 'hex');
    // paramBuf is in format of SEW paameter channel:
    // Index:       UINT : SEW parameter index (NOT the parameter number)
    // Data:        UDINT : Data(32 bit) 
    // SubIndex:    BYTE: Sew unit subindex (usually 0)
    // Reserved:    BYTE: 0
    // SubAddress1: BYTE: 0 if Parameter of Drive or com card, 1-63 for sbus
    // SubChannel1: BYTE: 0 if Parameter of Drive or com card, 2 sbus
    // SubAddress2: BYTE: 0
    // SubChannel2: BYTE: 0
    const paramValue = await PLC.getAttributeSingle(0x07, 1, 4, paraBuf); //class 0x07 Register, instance 1 to read (2 to set), attribute 4 param value 
    console.log('Got actual parameter value from VFD: ' + paramValue.toString('hex'));
    //we can set SEW paramters values as well, instance 2 must be used, the parameter and value is encoded same as for read
    //but the Data bytes are filled in with the new parameter value.
    // parameter 130 Speed Ramps1::Ramp t11 up CW, index 0x2116, value 6 seconds (6 seconds is transmitted as 6000)
    const newParaBuf = Buffer.from("1621701700000000000000000", 'hex');
    const newParamValue = await PLC.setAttributeSingle(0x07, 2, 4, newParaBuf); //class 0x07 Register, instance 1 to read (2 to set), attribute 4 param value 
    console.log('Set parameter succeeded');

}).catch((error) => {
    console.log(error);
  });
;

}
main();
```

### New I/O Scanner - ALPHA - NOT FOR PRODUCTION

#### Read And Write I/O On The Network

`Turn your computer into a PLC controller`

```javascript
const { IO } = require("st-ethernet-ip")

const scanner = new IO.Scanner(); // Iinitalize new scanner on default port 2222

// device configuration from manufacturer.
const config = {
  configInstance: {
    assembly: 100,
    size: 0
  },
  outputInstance: {
    assembly: 102,
    size: 6
  },
  inputInstance: {
    assembly: 101,
    size: 6
  }
}

// Add a connection with (device config, rpi, ip_address)
const conn = scanner.addConnection(config, 8, '192.168.86.42')

// After first UDP packet is received
conn.on('connected', () => {
  console.log('Connected')
  console.log('input data => ', conn.inputData) // Display Input Data Buffer.
  
  console.log('output data => ', conn.outputData) // Display Output Data Buffer.
  // Create alias for bits and integers (can be named what ever you want)
  conn.addOutputBit(4, 0, 'out0') // Using outputData. Skip 4 bytes, use bit 0 and call it 'out0'
  conn.addOutputBit(4, 1, 'out1') // Skip 4 bytes, use bit 1 and call it 'out1'
  conn.addOutputInt(2, 'outputValue0') // Skip 2 bytes then use 16bit integer and call it 'value0'
  conn.addInputBit(4, 7, 'in7') // Skip 4 bytes then use bit 7 and call it 'in7'
  conn.addInputInt(2, 'inputValue0')
  // Set values to be written to devices
  conn.setValue('out0', true) 
  conn.setValue('out1', false)
  conn.setValue('value0', 1234)
  // Read values from device connection
  console.log(conn.getValue('in7'))
  console.log(conn.getValue('inputValue0'))
})

// Called when UDP packets are not receiving. (Timeout is based on rpi setting)
conn.on('disconnected', () => {
  console.log('Disconnected')
})
```

## Demos

- **Monitor Tags for Changes Demo**

![Simple Demo](http://f.cl.ly/items/3w452r3v3i1s0Z1f2X11/Screen%20recording%202018-03-06%20at%2004.58.30%20PM.gif)

```javascript
const { Controller, Tag } = require("ethernet-ip");

// Intantiate Controller
const PLC = new Controller();

// Subscribe to Tags
PLC.subscribe(new Tag("TEST_TAG"););
PLC.subscribe(new Tag("TEST", "Prog"););
PLC.subscribe(new Tag("TEST_REAL", "Prog"););
PLC.subscribe(new Tag("TEST_BOOL", "Prog"););

// Connect to PLC at IP, SLOT
PLC.connect("10.1.60.205", 5).then(() => {
    const { name } = PLC.properties;

    // Log Connected to Console
    console.log(`\n\nConnected to PLC ${name}...\n`);

    // Begin Scanning Subscription Group
    PLC.scan();
});

// Initialize Event Handlers
PLC.forEach(tag => {
    tag.on("Changed", (tag, lastValue) => {
        console.log(`${tag.name} changed from ${lastValue} -> ${tag.value}`);
    });
})
```

## Built With

* [NodeJS](https://nodejs.org/en/) - The Engine
* [javascript - ES2017](https://maven.apache.org/) - The Language

## Contributers

* **Jason Serafin** - *Owner* - [GitHub Profile](https://github.com/SerafinTech)
* **Canaan Seaton** - *Forked From Owner* - [GitHub Profile](https://github.com/cmseaton42) - [Personal Website](http://www.canaanseaton.com/)
* **Patrick McDonagh** - *Collaborator* - [GitHub Profile](https://github.com/patrickjmcd)
* **Jeremy Henson** - *Collaborator* - [Github Profile](https://github.com/jhenson29)
  
## Related Projects

* [Node Red](https://github.com/netsmarttech/node-red-contrib-cip-ethernet-ip#readme)

Wanna *become* a contributor? [Here's](https://github.com/SerafinTech/node-ethernet-ip/blob/master/CONTRIBUTING.md) how!

## License

This project is licensed under the MIT License - see the [LICENCE](https://github.com/SerafinTech/node-ethernet-ip/blob/master/LICENSE) file for details
