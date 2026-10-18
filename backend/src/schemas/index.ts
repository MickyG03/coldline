// GraphQL SDL for the Coldline dashboard API. Resolvers live in src/resolvers.

export const typeDefs = /* GraphQL */ `
  scalar JSON

  enum StorageType { refrigerated frozen ultra_cold }
  enum Urgency { low medium high critical }
  enum IncidentStatus { open matching awaiting_responses recommended approved rejected closed }
  enum FacilityStatus { unknown calling confirmed conditional unavailable contradictory incomplete }
  enum DecideAction { approve reject }

  type Capacity {
    refrigerated: Int!
    frozen: Int!
    ultraCold: Int!
  }

  "A Jev label with its confidence (0..1)."
  type JevLabel {
    label: String!
    confidence: Float!
  }

  type Pharmacy {
    id: ID!
    name: String!
    address: String!
    neighborhood: String!
    lat: Float!
    lng: Float!
    staffName: String!
  }

  "A preapproved backup cold-storage site (synthetic seed data)."
  type Facility {
    id: ID!
    name: String!
    address: String!
    neighborhood: String!
    lat: Float!
    lng: Float!
    coordinator: String!
    receivingHours: String!
    capacity: Capacity!
    "Straight-line distance from the pharmacy, km."
    straightKm: Float!
  }

  "One judged answer from a coordinator, from the audit trail."
  type Answer {
    at: String!
    status: FacilityStatus!
    text: String
    labels: [JevLabel!]!
    reportedCapacity: Int
    receivingUntil: String
    conditions: String
  }

  "A facility as it stands for one incident."
  type IncidentFacility {
    facility: Facility!
    status: FacilityStatus!
    labels: [JevLabel!]!
    "Jev answer confidence, when judged."
    confidence: Float
    rawText: String
    reportedCapacity: Int
    receivingUntil: String
    conditions: String
    respondedAt: String
    driveMinutes: Int
    driveKm: Float
    updatedAt: String!
    answers: [Answer!]!
  }

  type Recommendation {
    rank: Int!
    status: FacilityStatus!
    summary: String!
    facility: Facility!
    response: IncidentFacility!
  }

  type Product {
    name: String!
    units: Int!
  }

  type Decision {
    id: ID!
    facility: Facility
    facilityId: ID!
    decidedBy: String!
    decision: String!
    reason: String
    decidedAt: String!
  }

  type AuditEntry {
    id: Int!
    type: String!
    incidentId: ID
    at: String!
    payload: JSON
  }

  type TranscriptLine {
    at: String!
    caller: String!
    facilityId: ID
    speaker: String!
    text: String!
  }

  type Alert {
    id: Int!
    at: String!
    kind: String!
    recipient: String!
    to: String
    message: String!
    status: String!
    detail: String
  }

  type Incident {
    id: ID!
    code: String!
    pharmacy: Pharmacy!
    products: [Product!]!
    totalUnits: Int!
    storageType: StorageType!
    currentTempC: Float
    minutesSinceFailure: Int
    urgency: Urgency!
    excursionOccurred: Boolean
    triage: [JevLabel!]!
    status: IncidentStatus!
    redTeam: Boolean!
    createdAt: String!
    updatedAt: String!
    facilities: [IncidentFacility!]!
    "Top-ranked open option (confirmed before conditional, then drive time)."
    recommendation: Recommendation
    options: [Recommendation!]!
    decisions: [Decision!]!
    transcript: [TranscriptLine!]!
    alerts: [Alert!]!
    audit(limit: Int): [AuditEntry!]!
  }

  type NetworkOverview {
    pharmacy: Pharmacy!
    facilities: [Facility!]!
    connected: Int!
    "Sites that reported capacity (confirmed/conditional) for the current request."
    readyToReceive: Int!
    "Shortest drive time among matched sites for the current request."
    nearestBackupMinutes: Int
  }

  type Route {
    facilityId: ID!
    encodedPolyline: String!
    durationMinutes: Int!
    distanceKm: Float!
  }

  type DemoStatus {
    simulating: Boolean!
    redteam: Boolean!
    businessClock: String!
    sms: String!
    lastError: String
  }

  type DecideResult {
    message: String!
    decision: Decision
    incident: Incident!
  }

  type Event {
    type: String!
    incidentId: ID
    auditId: Int!
    at: String!
    payload: JSON
  }

  input DemoIncidentInput {
    product: String
    units: Int
    reportedStorage: String
    currentTemp: String
    minutesSinceFailure: Int
  }

  type Query {
    "Newest active request (or the latest one if none are active)."
    currentIncident: Incident
    incident(id: ID!): Incident
    incidents(limit: Int): [Incident!]!
    network: NetworkOverview!
    facilities: [Facility!]!
    "Drive route geometry (Google Routes) from the incident's pharmacy to a facility."
    route(incidentId: ID!, facilityId: ID!): Route
    audit(incidentId: ID, limit: Int): [AuditEntry!]!
    demo: DemoStatus!
  }

  type Mutation {
    "Staff decision. Without facilityId, acts on the current recommendation."
    decide(incidentId: ID!, action: DecideAction!, facilityId: ID, decidedBy: String!, reason: String): DecideResult!
    "Run the simulated coordinators (staff1-3; optionally the red team afterwards). Returns at once."
    simulateResponders(incidentId: ID, redteam: Boolean, realClock: Boolean): DemoStatus!
    "Close all active incidents (audited) and restore the real clock."
    resetDemo: Boolean!
    "Open a request through the same path as pharmacy intake."
    openDemoIncident(input: DemoIncidentInput): Incident!
  }

  type Subscription {
    "Live event bus. Filter by incident (null-incident events always pass) and/or event types."
    events(incidentId: ID, types: [String!]): Event!
  }
`;
