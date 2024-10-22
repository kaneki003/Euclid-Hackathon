#[cfg(test)]
mod tests {
    use contract::{execute, instantiate};
    use cosmwasm_std::{
        testing::{message_info, mock_dependencies, mock_env, MockApi, MockQuerier, MockStorage}, Addr, OwnedDeps, Uint128
    };
    use msg::{ExecuteMsg, InstantiateMsg};
    use crate::{contract, msg, state::{GameSession, State, STATE}};

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
        let info = message_info(&Addr::unchecked("creator"), &[]); // Owner checking in

        print!("{}", info.sender.to_string());
    
        let msg = ExecuteMsg::PlaceBet {
            amount: bet_amount,
            player: player.clone(),
            mines: Uint128::new(3),
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
    fn test_resolve_game_win_updates_bet_amount() {
        let mut deps: OwnedDeps<cosmwasm_std::MemoryStorage, MockApi, MockQuerier> = setup_contract();
        let player = Addr::unchecked("player1");
        let bet_amount = Uint128::new(100);
        let info = message_info(&Addr::unchecked("creator"), &[]); // Owner should place bets

        // Place a bet
        let place_bet_msg = ExecuteMsg::PlaceBet {
            amount: bet_amount,
            player: Addr::unchecked(player.clone()),
            mines: Uint128::new(3),
        };
        let _ = execute(deps.as_mut(), mock_env(), info.clone(), place_bet_msg).unwrap();

        // Resolve game with a random number that guarantees a win
        let random_number = Uint128::new(2); // Random number for winning condition
        let resolve_msg = ExecuteMsg::ResolveGame {
            player: Addr::unchecked(player.clone()),
            number: random_number,
        };

        let res = execute(deps.as_mut(), mock_env(), info.clone(), resolve_msg).unwrap();
        assert_eq!(res.attributes, vec![("action", "game_resolved"), ("result", "win")]);

        // Check that the session is updated correctly
        let player_addr = Addr::unchecked(player.clone());
        let session: GameSession = STATE.load(&deps.storage).unwrap().sessions.get(&player_addr.to_string()).unwrap().clone();
        assert!(session.is_winner);

        // Calculate expected bet amount based on the multiplier
        //Added 1 in fav. outcomes due to 1 win

        let mut current_probability = (26 - session.wins.u128()-session.mines.u128()) as f64 / 25.0;
        current_probability=current_probability*100000000.0;

        let mut multiplier = 1.0 / (current_probability / 100000000.0);
        multiplier=multiplier* 100000000.0;
        
        //Asserting multiplier value
        assert_eq!(session.multiplier, Uint128::new(multiplier as u128));
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
            mines: Uint128::new(3),
        };
        let _ = execute(deps.as_mut(), mock_env(), info.clone(), place_bet_msg).unwrap();

        // Resolve game with an odd number to lose
        let random_number = Uint128::new(100000000); // Random number for losing condition
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
        assert!(!state.sessions.contains_key(&player_addr.to_string()));
    }

    #[test]
    fn test_claim_winnings() {
        let mut deps = setup_contract();
        let player = "player1".to_string();
        let bet_amount = Uint128::new(100);
        let info = message_info(&Addr::unchecked("creator"), &[]); // Owner should claim winnings

        let place_bet_msg = ExecuteMsg::PlaceBet {
            amount: bet_amount,
            mines: Uint128::new(3),
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

        let mut current_probability = (25-0-3) as f64 / 25.0;
        current_probability=current_probability*100000000.0;
        let multiplier = ((1.0 / (current_probability / 100000000.0))*100000000.0) as u128;
        let amount=bet_amount.u128() as f64 * (multiplier as f64 / 100000000.0);

        assert_eq!(claim_res.attributes, vec![("action", "claim_winnings"), ("amount", &amount.to_string())]);

        // Check that the session is removed
        let player_addr = Addr::unchecked(player.clone());
        assert!(STATE.load(&deps.storage).unwrap().sessions.get(&player_addr.to_string()).is_none());
    }
}