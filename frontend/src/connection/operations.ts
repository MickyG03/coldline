// GraphQL documents used by the dashboard.

const FACILITY = `id name neighborhood lat lng receivingHours straightKm capacity { refrigerated frozen ultraCold }`;

const INCIDENT = `
  id code status createdAt totalUnits storageType currentTempC minutesSinceFailure urgency excursionOccurred
  pharmacy { id name neighborhood lat lng staffName }
  products { name units }
  triage { label confidence }
  facilities {
    status confidence reportedCapacity receivingUntil conditions respondedAt driveMinutes driveKm
    labels { label confidence }
    answers { at status text reportedCapacity receivingUntil conditions labels { label confidence } }
    facility { ${FACILITY} }
  }
  recommendation { rank status summary facility { id name } }
  options { rank status summary facility { id name } }
  decisions { id decidedBy decision reason decidedAt facility { id name } }
  transcript { at caller facilityId speaker text }
  alerts { id at kind recipient to message status detail }
`;

const DEMO = `simulating redteam businessClock sms lastError`;

export const DASHBOARD = `
  query Dashboard($incidentId: ID!, $byId: Boolean!) {
    network { connected readyToReceive nearestBackupMinutes pharmacy { id name neighborhood lat lng staffName } facilities { ${FACILITY} } }
    currentIncident @skip(if: $byId) { ${INCIDENT} }
    incident(id: $incidentId) @include(if: $byId) { ${INCIDENT} }
    demo { ${DEMO} }
  }
`;

export const ROUTE = `
  query Route($incidentId: ID!, $facilityId: ID!) {
    route(incidentId: $incidentId, facilityId: $facilityId) { facilityId encodedPolyline durationMinutes distanceKm }
  }
`;

export const OPEN_DEMO_INCIDENT = `mutation OpenDemoIncident { openDemoIncident { id } }`;

export const SIMULATE = `
  mutation Simulate($incidentId: ID, $redteam: Boolean) {
    simulateResponders(incidentId: $incidentId, redteam: $redteam) { ${DEMO} }
  }
`;

export const RESET = `mutation ResetDemo { resetDemo }`;

export const DECIDE = `
  mutation Decide($incidentId: ID!, $action: DecideAction!, $facilityId: ID, $decidedBy: String!, $reason: String) {
    decide(incidentId: $incidentId, action: $action, facilityId: $facilityId, decidedBy: $decidedBy, reason: $reason) {
      message
    }
  }
`;

export const EVENTS = `subscription Events { events { type incidentId auditId at payload } }`;
