use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Addr, Uint128};

use crate::state::GameSession;

#[cw_serde]
pub struct InstantiateMsg {}

#[cw_serde]
pub enum ExecuteMsg {
    PlaceBet {
        amount: Uint128,
        player: Addr,
        mines: Uint128,
    },
    ResolveGame {
        player: Addr,
        number: Uint128,
    },
    ClaimWinnings {
        player: Addr,
    },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(Vec<GameSession>)]
    GetActiveSessions {},

    #[returns(GameSession)]
    GetPlayerSession {
        player: Addr,
    },
}

