extern crate byteorder;

use std::collections::HashMap;
use self::byteorder::{ByteOrder, BigEndian};
use web3::types::Address;
use std::str;

pub struct LogdataDeserializer<'a> {
    order: Vec<&'a str>,
    fields: HashMap<&'a str, &'a str>, // field name -> data type
    data: &'a Vec<u8>,
    offsets: HashMap<&'a str, (usize, usize)> // field name -> starting offset
}

impl<'a> LogdataDeserializer<'a> {
    pub fn new(data: &'a Vec<u8>, fields: HashMap<&'a str, &'a str>, order: Vec<&'a str>) -> LogdataDeserializer<'a> {
        let mut lds = LogdataDeserializer {
            data: data,
            fields: fields,
            order: order,
            offsets: HashMap::new()
        };
        
        lds.findAndStoreOffsets();
        lds
    }

    fn findAndStoreOffsets(&mut self) {

        //loop through fields
        let mut currentBlockOffset: usize = 0;
         for name in &self.order {
             let datatype = self.fields.get(name).unwrap();
             let startOffset = currentBlockOffset;
             
             let offsetTuple = match *datatype {
                 "uint" => (currentBlockOffset + 24, currentBlockOffset + 32), // = usize256 = 32 Bytes
                 "address" => (currentBlockOffset + 12, currentBlockOffset + 32), // = usually only 160b, but padded to 256b = 32 bytes
                 "string" => self.getStringOffsets(currentBlockOffset),
                 _ => {error!("Unsupported datatype in LogdataDeserializer"); (0,0)}
             };
            currentBlockOffset += 32;
             self.offsets.insert(name, offsetTuple);
        }
    }

    fn getStringOffsets(&self, stringPointerBlockOffset: usize) -> (usize, usize) {
        let slice = &self.data[(stringPointerBlockOffset+24)..(stringPointerBlockOffset+32)]; // Only take the least significant 8 Bytes into account (see description above)
        let stringLengthBlockOffset = BigEndian::read_u64(slice) as usize;

        let slice = &self.data[(stringLengthBlockOffset+24)..(stringLengthBlockOffset+32)];
        let stringLength = BigEndian::read_u64(slice) as usize;

        let stringStartOffset = stringLengthBlockOffset + 32;
        let stringEndOffset = stringStartOffset + stringLength;

        (stringStartOffset, stringEndOffset)
    }
    
    pub fn get_u64(&self, field_name: &str) -> u64 {
        //get field offset
        let (start, end) = self.offsets.get(field_name).unwrap();
        //get data type
        let datatype = self.fields.get(field_name).unwrap();
        
        match *datatype {
            "uint" => {
                /* The default uint contains 256b = 32 Bytes
                 * Byteorder supports a max of 64b, hence we hackily only take the least significant 64b = 8 Bytes
                 * into account when converting to u64.
                 * 
                 * Usage of uint should be discouraged, as it probably is too large for our usecases anyways
                 */  
                let slice = &self.data[*start..*end];
                BigEndian::read_u64(slice)
            }
            _ => {error!("Couldn't read u64 in LogdataDeserializer"); 0}
        }
    }

    pub fn get_address(&self, field_name: &str) -> Address {
        //get field offset
        let (start, end) = self.offsets.get(field_name).unwrap();
        //get data type
        let datatype = self.fields.get(field_name).unwrap();
        
        match *datatype {
            "address" => {
                /* The default address contains 160b, but its padded to 256b = 32 bytes
                 * Hence we only take the least significant 160b = 20 Bytes
                 */
                
                let slice = &self.data[*start..*end];
                Address::from_slice(slice)
            }
            _ => {error!("Couldn't read address in LogdataDeserializer"); Address::default()}
        }
    }

    pub fn get_str(&self, field_name: &str) -> &str {
        //get field offset
        let (start, end) = self.offsets.get(field_name).unwrap();
        //get data type
        let datatype = self.fields.get(field_name).unwrap();
        
        match *datatype {
            "string" => {
                let slice = &self.data[*start..*end];
                str::from_utf8(slice).unwrap()
            }
            _ => {error!("Couldn't read str in LogdataDeserializer"); ""}
        }
    }
}