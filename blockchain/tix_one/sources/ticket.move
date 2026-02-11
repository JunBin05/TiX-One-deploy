module tix_one::ticket;

use std::string::{Self, String};
use one::display;
use one::package;
use one::coin::{Self, Coin};
// OneChain's native token is 'OCT' (OneChain Token)
use one::oct::OCT;
use one::transfer_policy::{Self, TransferPolicy};

// --- Errors ---
const EPriceTooHigh: u64 = 1;
const EIncorrectAmount: u64 = 2;

// --- The Ticket ---
public struct Ticket has key, store {
    id: UID,
    artist: String,
    event_name: String,
    seat: String,
    original_price: u64,
}

// --- Rule & Witness ---
public struct PriceCapRule has drop {}
public struct TICKET has drop {}

// --- Admin Control ---
public struct AdminCap has key { id: UID }

fun init(otw: TICKET, ctx: &mut TxContext) {
    let keys = vector[
        string::utf8(b"name"),
        string::utf8(b"description"),
        string::utf8(b"image_url"),
    ];

    let values = vector[
        string::utf8(b"TiX-One: {artist}"),
        string::utf8(b"Official ticket for {event_name}. Seat: {seat}"),
        string::utf8(b"https://api.dicebear.com/7.x/identicon/svg?seed={id}"),
    ];

    let publisher = package::claim(otw, ctx);
    let mut display = display::new_with_fields<Ticket>(
        &publisher, keys, values, ctx
    );

    display::update_version(&mut display);

    // FIX 1: AdminCap uses 'transfer::transfer' (safer for restricted objects)
    transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
    
    transfer::public_transfer(display, ctx.sender());
    transfer::public_transfer(publisher, ctx.sender());
}

// --- Primary Sale ---
public fun buy_ticket(
    payment: Coin<OCT>,
    artist: String,
    event_name: String,
    seat: String,
    ctx: &mut TxContext
) {
    let price = 100; // 100 OCT
    assert!(coin::value(&payment) == price, EIncorrectAmount);
    
    // Money goes to your Treasury
    transfer::public_transfer(payment, @0xe551904e859d3358ca7813622f9ada529ddecd24801a5f6bddb4a521fcb9c940);

    let ticket = Ticket {
        id: object::new(ctx),
        artist,
        event_name,
        seat,
        original_price: price,
    };
    
    transfer::public_transfer(ticket, ctx.sender());
}

// --- Universal Resale Enforcer ---
public fun verify_resale(
    _policy: &mut TransferPolicy<Ticket>,
    request: &mut transfer_policy::TransferRequest<Ticket>,
    ticket: &Ticket,
    payment_amount: u64
) {
    assert!(payment_amount <= ticket.original_price, EPriceTooHigh);
    transfer_policy::add_receipt(PriceCapRule {}, request);
}
