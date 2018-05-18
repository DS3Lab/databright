extern crate ini;
extern crate csv;

use ini::Ini;

fn main() {
    let conf = Ini::load_from_file("config.ini").unwrap();
    let section = conf.section(Some("Contracts".to_owned())).unwrap();
    let contracts = section.get("contracts").unwrap();
    let contract_path = section.get("contractpath").unwrap();

    for contract in contracts.split(",") {
        let mut rdr = csv::Reader::from_path(format!("{}{}.topic",contract_path, contract)).unwrap();
        for rec in rdr.records() {
            println!("{:?}", rec);
        }
    }
}