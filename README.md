# trade-simulation-game
A multi-player trading simulation game
The purpose of this project is for education. Participants are required to join the online game together at the same time. 
Each of the player will have:
  1. Name
  2. Cash value (for example 100 usd at start)
  3. Share number (start with zero)
There will be a made-up stock with historical price showing on all players' screen. Each round, each player can choose from
  1. Buying shares, subject to their available cash
  2. Sell shares, subject to their holdings.
  3. Do nothing
For trading action, they need to submit a price they willing to accept like bid and ask price.
Once all players submitted their actions, the system will automatically work out the successful trades based on matching rules.
Then the system will automatically do the settlements.
As a consequnce, each player will see their new cash holding and share number.

Each round the price of the stock is decided by the agreed price among the players. This is exactly the same as exchange. If not trade was done, the price will be remain the highest bid price among all the bidders. 
