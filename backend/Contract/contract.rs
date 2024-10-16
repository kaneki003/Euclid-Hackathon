use cosmwasm_std::{DepsMut, Env, MessageInfo, Response, StdResult, Addr, Uint128, BankMsg, Coin};
use crate::state::{State, STATE, GameSession};
use rand::Rng;
use std::collections::HashMap;

pub fn instantiate(deps: DepsMut, _env: Env, info: MessageInfo) -> StdResult<Response> {
    let state = State {
        owner: info.sender.clone(),  // Set the contract owner as the one who instantiates it
        sessions: HashMap::new(),    // Use a HashMap to store player sessions
    };

    STATE.save(deps.storage, &state)?;
    Ok(Response::default())
}

// Ensure only the owner (platform) can call this function
fn check_owner(state: &State, info: &MessageInfo) -> StdResult<()> {
    if state.owner != info.sender {
        return Err(cosmwasm_std::StdError::generic_err("Unauthorized: only the owner can perform this action"));
    }
    Ok(())
}

pub fn place_bet(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    amount: Uint128
) -> StdResult<Response> {
    let mut state = STATE.load(deps.storage)?;

    let session = GameSession {
        player: info.sender.clone(),
        bet_amount: amount,
        random_number: None,
        is_active: true,
        is_winner: false,
    };

    // Insert session into the map with the player's address as the key
    state.sessions.insert(info.sender.clone(), session);
    STATE.save(deps.storage, &state)?;

    Ok(Response::new().add_attribute("action", "bet_placed"))
}

pub fn resolve_game(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,  // checking if platform is calling
    player: Addr,
    number: Uint128  // Random number generated by the player
) -> StdResult<Response> {
    let mut state = STATE.load(deps.storage)?;

    // Ensure only the owner (platform) can resolve games
    check_owner(&state, &info)?;

    // Find the session for the passed player
    if let Some(session) = state.sessions.get_mut(&player) {
        if session.is_active {
            let random_number = number.u128();

            // Logic of winning game to be changed.... (currently 50% chance of winning)
            if random_number % 2 == 0 {
                session.is_winner = true;
                session.bet_amount += session.bet_amount / Uint128::new(2);  // Increase bet amount by 50%
            } else {
                session.is_winner = false;
            }

            session.is_active = false;  // Mark session as inactive
            STATE.save(deps.storage, &state)?;

            return Ok(
                Response::new()
                    .add_attribute("action", "game_resolved")
                    .add_attribute("result", if session.is_winner { "win" } else { "loss" })
            );
        }
    }

    Ok(Response::new().add_attribute("action", "no_active_session"))
}

pub fn claim_winnings(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo, 
    player: Addr
) -> StdResult<Response> {
    let mut state = STATE.load(deps.storage)?;

    // Ensure only the owner (platform) can claim winnings
    check_owner(&state, &info)?;

    // Find the session for the passed player
    if let Some(session) = state.sessions.get(&player) {
        if !session.is_active && session.is_winner {
            let payout = session.bet_amount;  // Use the updated bet amount

            let payment_msg = BankMsg::Send {
                to_address: player.to_string(),
                amount: vec![Coin {
                    denom: "token".to_string(),
                    amount: payout,
                }],
            };

            // No need to mark the session inactive again, since it's already done in resolve_game
            STATE.save(deps.storage, &state)?;

            return Ok(
                Response::new().add_message(payment_msg).add_attribute("action", "claim_winnings")
            );
        } else {
            return Ok(Response::new().add_attribute("action", "player_lost"));
        }
    }

    Ok(Response::new().add_attribute("action", "no_active_session"))
}
