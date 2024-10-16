use cw_storage_plus::Item;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use cosmwasm_std::{Addr, Uint128};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct GameSession {
    pub player: Addr,
    pub bet_amount: Uint128,
    pub random_number: Option<u64>,
    pub is_active: bool,
    pub is_winner: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct State {
    pub owner: Addr,
    //HashMap where the key is the player's address, and the value is their session
    pub sessions: HashMap<Addr, GameSession>,
}

pub const STATE: Item<State> = Item::new("state");
