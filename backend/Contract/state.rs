use cw_storage_plus::Item;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use cosmwasm_std::{Addr, Uint128};
use cw_storage_plus::Map;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]

pub struct GameSession {
    pub player: Addr,
    pub bet_amount: Uint128,
    pub mines: Uint128,
    pub probability: Uint128,
    pub wins: Uint128,
    pub multiplier: Uint128,
    pub is_active: bool,
    pub is_winner: bool,

}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct State {
    pub owner: Addr,
}

pub const STATE: Item<State> = Item::new("state");
pub const SESSIONS: Map<String, GameSession> = Map::new("sessions");
