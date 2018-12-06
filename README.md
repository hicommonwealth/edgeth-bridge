# edgeth_bridge
This repo encapsulates the Ethereum contracts related to [edge_bridge](https://github.com/hicommonwealth/edge_bridge) between Edgeware a la edgeth. We port the functionality over from Peggy which allows us to also handle arbitrary tokens on Edgeware when the need arises. Also contained in this project is a watcher for Ethereum bridge events/requests. The watcher acts as a stateless listener for new requests and should altruistically publish these requests onto Edgeware. This will most likely be broken out into a different repo in the future.

## How does the watcher work?
The watcher will only listen to these contracts and, more specifically, their events. When it hears of new bridge request events, the operator of the watcher should simultaneously publish these facts to Edgeware in their respective place such as for deposits or withdrawals.
