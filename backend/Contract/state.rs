use cw_storage_plus::Item;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use cosmwasm_std::{Addr, Uint128};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct GameSession {
    pub player: Addr,
    pub bet_amount: f64,
    pub mines: Uint128,
    pub probability: f64,
    pub multiplier: f64,
    pub wins: Uint128,
    pub is_active: bool,
    pub is_winner: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct State {
    pub owner: Addr,
    pub sessions: HashMap<String, GameSession>, //changes key to string value
}

pub const STATE: Item<State> = Item::new("state");
