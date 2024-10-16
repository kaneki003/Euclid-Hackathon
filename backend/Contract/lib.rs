pub mod contract;
mod error;
pub mod helpers;
pub mod msg;
pub mod state;

pub use crate::error::ContractError;

#[cfg(test)]
mod tests {
    use super::*;
    use contract::{execute, instantiate};
    use cosmwasm_std::{
        testing::{message_info, mock_dependencies, mock_env, MockApi, MockQuerier, MockStorage}, Addr, OwnedDeps, Uint128
    };
    use msg::{ExecuteMsg, InstantiateMsg};
    use crate::state::{GameSession, State, STATE};

    // Helper function to set up the mock dependencies
    fn setup_contract() -> OwnedDeps<MockStorage, MockApi, MockQuerier> {
        let mut deps = mock_dependencies();
        let msg = InstantiateMsg {}; // Add any required fields for InstantiateMsg here
        let info = message_info(&Addr::unchecked("creator"), &[]);
        let _ = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();
        deps
    }

    #[test]
    fn test_instantiate() {
        let deps = setup_contract();
        let state: State = STATE.load(&deps.storage).unwrap();
        assert_eq!(state.owner, Addr::unchecked("creator"));
        assert!(state.sessions.is_empty());
    }

    #[test]
    fn test_place_bet() {
        let mut deps: OwnedDeps<cosmwasm_std::MemoryStorage, MockApi, MockQuerier> = setup_contract();
        let player = Addr::unchecked("player1");
        let bet_amount = Uint128::new(100);
        let info = message_info(&Addr::unchecked("creator"), &[]); // Owner should place bets
    
        let msg = ExecuteMsg::PlaceBet {
            amount: bet_amount,
            player: player.clone(),
        };
    
        
        let res = execute(deps.as_mut(), mock_env(), info.clone(), msg).unwrap();
        assert_eq!(res.attributes, vec![("action", "bet_placed")]);

        // Check that the session was created
        let state = STATE.load(&deps.storage).unwrap();
        let session: GameSession = state
            .sessions
            .get(&player.to_string())  // Using String as the key
            .unwrap()
            .clone();

        assert_eq!(session.player, Addr::unchecked("player1"));
        assert_eq!(session.bet_amount, bet_amount);
        assert!(session.is_active);
        assert!(!session.is_winner);
    }
    
    

    #[test]
    fn test_resolve_game_win() {
        let mut deps = setup_contract();
        let player = "player1".to_string();
        let bet_amount = Uint128::new(100);
        let info = message_info(&Addr::unchecked("creator"), &[]); // Owner should resolve games

        let place_bet_msg = ExecuteMsg::PlaceBet {
            amount: bet_amount,
            player: Addr::unchecked(player.clone()),
        };
        let _ = execute(deps.as_mut(), mock_env(), info.clone(), place_bet_msg).unwrap();

        // Resolve game with an even number to win
        let random_number = Uint128::new(2); // Random number for winning condition
        let resolve_msg = ExecuteMsg::ResolveGame {
            player: Addr::unchecked(player.clone()) ,
            number: random_number,
        };

        let res = execute(deps.as_mut(), mock_env(), info.clone(), resolve_msg).unwrap();
        assert_eq!(res.attributes, vec![("action", "game_resolved"), ("result", "win")]);

        // Check that the session is updated
        let player_addr = Addr::unchecked(player.clone());
        let session: GameSession = STATE.load(&deps.storage).unwrap().sessions.get(&player_addr.to_string()).unwrap().clone();
        assert!(session.is_winner);
        assert_eq!(session.bet_amount, Uint128::new(150)); // Should be increased by 50%
    }

    #[test]
    fn test_resolve_game_loss() {
        let mut deps = setup_contract();
        let player = "player1".to_string();
        let bet_amount = Uint128::new(100);
        let info = message_info(&Addr::unchecked("creator"), &[]); // Owner should resolve games

        let place_bet_msg = ExecuteMsg::PlaceBet {
            amount: bet_amount,
            player: Addr::unchecked(player.clone()) ,
        };
        let _ = execute(deps.as_mut(), mock_env(), info.clone(), place_bet_msg).unwrap();

        // Resolve game with an odd number to lose
        let random_number = Uint128::new(3); // Random number for losing condition
        let resolve_msg = ExecuteMsg::ResolveGame {
            player: Addr::unchecked(player.clone()) ,
            number: random_number,
        };

        let res = execute(deps.as_mut(), mock_env(), info.clone(), resolve_msg).unwrap();
        assert_eq!(res.attributes, vec![("action", "game_resolved"), ("result", "loss")]);


        // Check that the session is removed
        let player_addr = Addr::unchecked
        (player.clone());
        let state = STATE.load(&deps.storage).unwrap();
        assert!(state.sessions.contains_key(&player_addr.to_string()));
    }

    #[test]
    fn test_claim_winnings() {
        let mut deps = setup_contract();
        let player = "player1".to_string();
        let bet_amount = Uint128::new(100);
        let info = message_info(&Addr::unchecked("creator"), &[]); // Owner should claim winnings

        let place_bet_msg = ExecuteMsg::PlaceBet {
            amount: bet_amount,
            player: Addr::unchecked(player.clone()) ,
        };
        let _ = execute(deps.as_mut(), mock_env(), info.clone(), place_bet_msg).unwrap();

        // Resolve the game so player can win
        let random_number = Uint128::new(2); // Random number for winning condition
        let resolve_msg = ExecuteMsg::ResolveGame {
            player: Addr::unchecked(player.clone()) ,
            number: random_number,
        };
        let _res = execute(deps.as_mut(), mock_env(), info.clone(), resolve_msg).unwrap();

        // Now claim winnings
        let claim_msg = ExecuteMsg::ClaimWinnings { player: Addr::unchecked(player.clone()) };
        let claim_res = execute(deps.as_mut(), mock_env(), info.clone(), claim_msg).unwrap();
        assert_eq!(claim_res.attributes, vec![("action", "claim_winnings"), ("amount", &Uint128::new(150).to_string())]);

        // Check that the session is removed
        let player_addr = Addr::unchecked(player.clone());
        assert!(STATE.load(&deps.storage).unwrap().sessions.get(&player_addr.to_string()).is_none());
    }
}
