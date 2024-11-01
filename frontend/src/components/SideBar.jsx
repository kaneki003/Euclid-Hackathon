import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { getAllSessions } from '../ContractFunctions/functions';

function SideBar() {
  const [show, setShow] = useState(false);
  const [history, setHistory] = useState([]);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  useEffect(() => {
    getAllSessions().then((sessions) => {
      console.log('Sessions:', sessions);

      // Format session data for display
      const formattedHistory = sessions.map((session, index) => ({
        id: index + 1,
        betAmount: `$${session.bet_amount}`,
        multiplier: `x${(session.multiplier / 100000000).toFixed(2)}`,
        result: session.is_active ? "In Process" : session.is_winner ? "Win" : "Loss",
        mines: session.mines,
        player: session.player,
        probability: `${(session.probability / 1000000).toFixed(2)}%`,
        winnings: `$${session.wins}`,
      }));

      setHistory(formattedHistory);
    });
  }, []);

  return (
    <>
      <Button variant="outline-light" onClick={handleShow}>
        View History
      </Button>

      <Offcanvas show={show} onHide={handleClose} className="bg-dark text-light">
        <Offcanvas.Header closeButton className="bg-dark text-light border-bottom border-secondary">
          <Offcanvas.Title>History</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="bg-dark text-light" style={{ height: '100%', overflowY: 'auto' }}>
          <div className="mt-4">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="mb-3 p-4 rounded-lg glass-card shadow-lg"
              >
                <div className="d-flex justify-content-between mb-2">
                  <span className="fw-bold">Bet Amount:</span>
                  <span>{entry.betAmount}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="fw-bold">Multiplier:</span>
                  <span>{entry.multiplier}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="fw-bold">Result:</span>
                  <span
                    className={`fw-bold ${
                      entry.result === 'Win'
                        ? 'text-success'
                        : entry.result === 'Loss'
                        ? 'text-danger'
                        : 'text-warning'
                    }`}
                  >
                    {entry.result}
                  </span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="fw-bold">Mines:</span>
                  <span>{entry.mines}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="fw-bold">Probability:</span>
                  <span>{entry.probability}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="fw-bold">Winnings:</span>
                  <span>{entry.winnings}</span>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <p className="text-center text-muted">No history available</p>
            )}
          </div>
        </Offcanvas.Body>

        {/* Additional Styling for Glass Effect and Scrollbar */}
        <style jsx="true">{`
          .Offcanvas.Body {
            overflow-y: auto;
          }
          /* Glass Effect */
          .glass-card {
            background: rgba(255, 255, 255, 0.07); /* slightly darker for contrast */
            backdrop-filter: blur(8px); /* smooth glass effect */
            border: 1px solid rgba(255, 255, 255, 0.15); /* subtle border */
            transition: transform 0.3s ease;
          }
          .glass-card:hover {
            transform: scale(1.02); /* subtle hover effect */
            background: rgba(255, 255, 255, 0.1); /* slightly lighter on hover */
          }
          /* Custom Scrollbar */
          .Offcanvas.Body::-webkit-scrollbar {
            width: 6px;
          }
          .Offcanvas.Body::-webkit-scrollbar-thumb {
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
          }
          .Offcanvas.Body::-webkit-scrollbar-track {
            background: transparent;
          }
        `}</style>
      </Offcanvas>
    </>
  );
}

export default SideBar;
