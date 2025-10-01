# nostr-p2p

Build your own peer-to-peer messaging protocol, transmitted by relays.

## Overview

This project provides a light-weight client for building your own peer-to-peer messaging protocol on-top of the Nostr relay network. The client handles peering, encryption, message routing, and relay management while providing a simple API for developers.

### Features

* **Simplified Messaging**  
  Provides a `SignedMessage` object for passing structured messages between peers, with support for direct messages, broadcasts, multicasts, and request-response.

* **Event-Driven Routing**  
  Includes an event-based inbox for handling incoming messages, with emitters for event type, message ID, peer pubkey, and topic tag.

* **Encryption and Validation**  
  Messages are end-to-end encrypted (AES-256-GCM) between peers, with strict runtime validation (using Zod).

* **Message Receipts**  
  Detailed promise-based receipts for asynchronous message delivery and response collection.

* **Reference Node**  
  Implements a generic `NostrNode` class with manageable relay connections, event filters, and timeouts.

## Installation

The `nostr-p2p` package can be installed in both node and browser environments. It's available through the npm registry for node projects, and via the unpkg CDN for browser applications.

### Node Environment

For node environments, simply install the package using your preferred package manager:

```bash
npm install @cmdcode/nostr-p2p
```

Then, import the package in your project:

```ts
import { NostrNode } from '@cmdcode/nostr-p2p'
```

### Browser Environment

You can include the package directly in your HTML file:

```html
<script src="https://unpkg.com/@cmdcode/nostr-p2p/dist/script.js"></script>
<script>
  const { NostrNode } = window.nostr_p2p
</script>
```

You can also import it as a module in modern browsers:

```html
<script type="module">
  import { NostrNode } from 'https://unpkg.com/@cmdcode/nostr-p2p/dist/module.js'
</script>
```

## Basic Usage

The core component of this library is the `NostrNode` client, which handles all the complexities of peer-to-peer messaging.

Each node can:
- Connect to multiple relays for redundancy.
- Send encrypted messages to specific peers.
- Broadcast messages to multiple peers.
- Handle request-response patterns.
- Subscribe to specific message types or peers.
- Manage message delivery receipts.

### Creating a Node

Create a basic Nostr node and connect it to a relay:

```typescript
import { NostrNode } from '@cmdcode/nostr-p2p'

// List of relays to connect to.
const relays = [
  'wss://relay.nostrdice.com',
  'wss://relay.snort.social'
]

// Create a new Nostr node.
const seckey = '...' // Your private key.
const node   = new NostrNode(relays, seckey)

node.on('ready', () => {
  // Fires when the node is ready to send and receive messages.
  console.log('connected to:', node.relays)
})

// Connect to the relays.
await node.connect()
```

You can configure the node with additional options:

```ts
interface NodeOptions {
  envelope     ?: Partial<EventConfig>  // Event envelope configuration. 
  filter       ?: Partial<EventFilter>  // Event filter configuration.
  req_timeout  ?: number                // Request timeout.
  since_offset ?: number                // Time offset for filtering events.
  start_delay  ?: number                // Delay before starting to listen for events.
}
```

### Message Structure

Messages are structured in a basic format, with a message `id`, a topic `tag`, and a `data` payload:

```ts
interface MessageTemplate {
  data : Json    // The message payload, serialized as JSON.
  id?  : string  // Identifier for tracking specific messages.
  tag  : string  // A label to categorize and filter messages.
}
```

When sending a message, you can specify additional options for the delivery:

```ts
interface DeliveryOptions {
  cache?   : Map<string, PubResponse>  // Cache for tracking publishing status.
  kind?    : number                    // The kind of event to publish.
  tags?    : string[][]                // Additional tags to include in the event.
  timeout? : number                    // The timeout for the delivery response (if any).
}
```

Delivered messages also include the original nostr event, stored as `env` (short for envelope):

```ts
interface SignedMessage {
  data : Json         // The message payload as JSON.
  env  : SignedEvent  // Original signed nostr event.
  id   : string       // The message identifier.
  tag  : string       // The message topic.
}
```

### Messaging API

The `NostrNode` client provides several methods for sending and receiving messages.

#### Direct Messages

The `publish` method encrypts and sends a message to a single peer:

```ts
const res : Promise<PubResponse> = node.publish(
  message  : MessageTemplate,
  peer_pk  : string,
  options? : Partial<DeliveryOptions>
)
```

The `PubResponse` object includes the following properties:

```ts
interface PubResponse {
  acks    : string[]  // List of relays that acknowledged the message.
  fails   : string[]  // List of relays that failed to respond.
  ok      : boolean   // True if at least one relay acknowledged.
  peer_pk : string    // The public key of the recipient peer.
}
```

#### Broadcasts

The `broadcast` method sends a message to multiple peers:

```ts
const res : Promise<BroadcastResponse> = node.broadcast(
  message  : MessageTemplate,
  peers    : string[],
  options? : Partial<DeliveryOptions>
)
```

All messages share the same message `id` and `tag`, but each recipient receives their own encrypted copy.

The `BroadcastResponse` object includes the following properties:

```ts
interface BroadcastResponse {
  cache  : Map<string, PubResponse>  // Map of each peer pubkey to their PubResponse.
  ok     : boolean                   // True if all responses were successful.
  peers  : string[]                  // List of peers that received the message.
}
```

#### Request and Response

The `request` method is useful when you expect a response from the peer:

```ts
const res : Promise<ReqResponse> = node.request(
  message  : MessageTemplate,
  peer_pk  : string,
  options? : Partial<DeliveryOptions>
)
```

The `ReqResponse` object includes the following properties:

```ts
interface ReqResponse {
  pub : PubResponse  // The PubResponse from publishing to the relays.
  sub : SubResponse  // The SubResponse from listening for the message id.
}
```

#### Multi-Peer Requests

The `multicast` method is useful when you expect a response from multiple peers:

```ts
const res : Promise<MulticastResponse> = node.multicast(
  message  : MessageTemplate,
  peers    : string[],
  options? : Partial<DeliveryOptions>
)
```

It sends a request to multiple peers and collects their responses, returning an array of all received responses within the timeout period.

The `MulticastResponse` object includes the following properties:

```ts
interface MulticastResponse {
  pub : BroadcastResponse  // The BroadcastResponse from publishing to the relays.
  sub : SubResponse        // The SubResponse from listening for the message id.
}
```

#### Custom Subscriptions

The `subscribe` method allows you to implement a custom message listener with a timeout:

```ts
interface SubFilter {
  id    ?: string    // The message id to listen for.
  peers ?: string[]  // The peers to listen for.
  tag   ?: string    // The message tag to listen for.
}

interface SubConfig {
  threshold ?: number  // The number of responses to collect.
  timeout   ?: number  // The timeout for the subscription.
}

// Custom subscription
const sub : Promise<SubResponse> = node.subscribe (
  filter  : EventFilter,
  options : Partial<SubConfig>
)
```
This method is useful when you need to implement a custom message listener that is not covered by the other methods.

The `SubResponse` object includes the following properties:

```ts
type ResolveReason = 'complete' | 'timeout' | 'threshold'

interface SubResponse {
  authors : string[]         // List of authors that published messages matching the filter.
  inbox   : SignedMessage[]  // List of messages matching the filter. 
  ok      : boolean          // True if at least one message was found.
  peers   : string[]         // List of peers that published messages matching the filter.
  reason  : ResolveReason    // The reason the subscription was resolved.
}
```

### Event Handling

The SDK provides an event inbox system for handling incoming messages. You can listen for messages using various filters:

#### On Message ID

For tracking messages with a specific ID, such as responses to requests:

```ts
node.inbox.id.on('deadbeef', (msg : SignedMessage) => {
  console.log('Got message:', msg.data)
})
```

#### On Message Peer

For tracking messages from a specific peer, based on their public key:

```ts
node.inbox.peer.on('pubkey123', (msg : SignedMessage) => {
  console.log('From peer:', msg.data)
})
```

#### On Message Topic

Listens for messages with a specific topic, allowing you to handle different types of messages with dedicated handlers.

```ts
node.inbox.tag.on('status', (msg : SignedMessage) => {
  console.log('Status update:', msg.data)
})
```

#### Inbox Events

The inbox emits several events that you can subscribe to for monitoring message handling:

```ts
// Listen for published messages.
node.inbox.event.on('published', (msg: SignedMessage) => {
  console.log('Message published:', msg)
})

// Listen for broadcast results
node.inbox.event.on('broadcast', (res: BroadcastResponse & MessageIdResponse) => {
  console.log('Broadcast complete:', response)
})

// Listen for settled messages (completed deliveries)
node.inbox.event.on('settled', (res: PubResponse & MessageIdResponse) => {
  console.log('Message settled:', response)
})
```

#### Node Events

The node itself emits several events that provide comprehensive monitoring of its operation:

```ts
// Listen for bounced events
node.on('bounced',    (event_id: string, error: string) => console.log('Message bounced:', event_id, error))
// Listen for when the node is closed.
node.on('closed',     (node: NostrNode)    => console.log('Node closed:', node))
// Listen for debug messages
node.on('debug',      (info: unknown)      => console.log('Debug:', info))
// Listen for errors.
node.on('error',      (error: unknown)     => console.error('Node error:', error))
// Listen for info messages.
node.on('info',       (info: Json)         => console.log('Info:', info))
// Listen for received messages.
node.on('message',    (msg: SignedMessage) => console.log('Received message:', msg))
// Listen for when the node is ready to send and receive messages.
node.on('ready',      (node: NostrNode)    => console.log('Node is ready:', node))
// Listen for new subscriptions to the relays.
node.on('subscribed', (sub_id: string, filter: EventFilter) => console.log('New subscription:', sub_id, filter))
```

### Advanced Features

Here are some advanced features that you can use:

#### Event Handling Options
```ts
// Time-limited subscriptions
node.inbox.tag.within('status', (msg) => {
  console.log('Status within 5s:', msg)
}, 5000)
```
The `within` method creates a temporary subscription that automatically unsubscribes after the specified timeout. This is useful for gathering time-sensitive responses.

```ts
// One-time handlers
node.inbox.id.once('deadbeef', (msg) => {
  console.log('First response:', msg)
})
```
Use `once` when you only need to handle the first occurrence of a message. The handler automatically unsubscribes after being triggered once.

### Demo Example

Here is a basic example of how to pass a message between two nodes:

```ts
// Create the actors.
const Alice = new NostrNode(relays, alice_sk)
const Bob   = new NostrNode(relays, bob_sk)

// Configure the Alice node.
Alice.inbox.tag.on('ping', (msg) => {
  const res = { id: msg.id, tag: 'pong', data: 'pong!' }
  Alice.publish(res, msg.env.pubkey)
})

Alice.on('ready', () => {
  console.log('alice connected')
})

// Configure the Bob node.
Bob.inbox.tag.on('pong', (msg) => {
  console.log('received pong message:', msg.data)
  cleanup()
})

Bob.on('ready', () => {
  console.log('bob connected')
  Bob.publish({ tag: 'ping', data: 'ping!' }, Alice.pubkey)
})
```
You can see a full example of this in the `test/demo.ts` file, and run the demo yourself with `npm run demo`.

## Development

The project is built using the `rollup` bundler and `tsx` for live transpilation. The `script/build.sh` script will build the project and copy the necessary files to the `dist` directory.

```bash
# Install dependencies.
npm install

# Run test suite
npm test

# Build package to dist directory.
npm run build
```

The test suite contains a basic implementation of a nostr relay, plus methods for generating a set of nodes. Please refer to the `test/tape.ts` file for more details.

## Roadmap

Here is a list of features that are planned for future releases:

* **Peer Discovery**  
  Currently, each node must be manually configured with a list of peers. We plan to implement 
  a message channel for automatic peer discovery, including join/leave notifications.

* **Public Profiles**  
  Enable nodes to leverage public profiles for advertising their presence and sharing metadata 
  with the network.

* **Private Stores**  
  Implement a secure, local storage system for each node to maintain configuration and state 
  data persistently.

* **Shared Stores**  
  Develop a distributed data sharing mechanism allowing nodes to maintain and synchronize 
  shared data repositories.

## Resources

This project uses the following open source libraries:

- [Buff](https://github.com/cmdcode/buff): Swiss-army knife for byte manipulation and encoding.
- [Noble Curves](https://github.com/paulmillr/noble-curves): A fast, lightweight ECC library.
- [Noble Ciphers](https://github.com/paulmillr/noble-ciphers): A fast, lightweight encryption library.
- [Nostr Tools](https://github.com/nostr-tools): Tools for working with the Nostr protocol.
- [Zod](https://github.com/colinhacks/zod): Run-time data validation library.

## License

MIT
