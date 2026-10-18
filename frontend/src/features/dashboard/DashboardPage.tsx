import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import styled from "styled-components";
import { AppShell } from "../../components/AppShell.tsx";
import { Card } from "../../components/Card.tsx";
import { DashboardProvider, useDashboard } from "../../provider/DashboardProvider.tsx";
import { ActivityPanels } from "../activity/ActivityPanels.tsx";
import { useFacilityViews, useFilters } from "../filters.ts";
import { MapToolbar } from "../map/MapToolbar.tsx";
import { NetworkMap } from "../map/NetworkMap.tsx";
import { ActiveRequest } from "../request/ActiveRequest.tsx";
import { RecommendationCard } from "../request/RecommendationCard.tsx";
import { WithinReach } from "../request/WithinReach.tsx";
import { DemoToolbar } from "./DemoToolbar.tsx";
import { Hero } from "./Hero.tsx";
import { StatsRow } from "./StatsRow.tsx";

const Content = styled.main`
  max-width: ${({ theme }) => theme.sizes.layout.content};
  padding: ${({ theme }) => `0 ${theme.sizes.space.xxxl}`};
`;

const MainCard = styled(Card)`
  display: grid;
  grid-template-columns: 1fr ${({ theme }) => theme.sizes.layout.sidePanel};
`;

const MapSide = styled.div`
  min-width: 0;
  border-right: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
`;

const Side = styled.aside`
  display: flex;
  flex-direction: column;
  max-height: calc(${({ theme }) => theme.sizes.layout.map} + 66px);
  overflow-y: auto;
  background: ${({ theme }) => theme.palette.surfaceMuted};
`;

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });

function Dashboard() {
  const { data, error, live, events, busy, selectedId, select, route, newRequest, simulate, reset, decide } = useDashboard();
  const filters = useFilters();
  const incident = data?.incident ?? null;
  const views = useFacilityViews(data?.network.facilities ?? [], incident, filters);
  const { hash } = useLocation();

  // SMS approval links land on /incidents/:id#approve.
  useEffect(() => {
    if (hash === "#approve" && incident) scrollTo("approve");
  }, [hash, incident?.id]);

  return (
    <AppShell
      title="Network overview"
      nav={[
        { icon: "map", label: "Network map", active: true, onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
        { icon: "grid", label: "Facilities", onClick: () => scrollTo("within-reach") },
        { icon: "pulse", label: "Activity", onClick: () => scrollTo("activity") },
      ]}
      footer={[
        { icon: "sliders", label: "Demo controls", onClick: () => scrollTo("demo") },
        { icon: "help", label: "About Coldline" },
      ]}
    >
      <Content>
        <Hero network={data?.network ?? null} onNewRequest={newRequest} busy={busy === "new"} />
        <StatsRow network={data?.network ?? null} />
        <DemoToolbar demo={data?.demo ?? null} hasIncident={!!incident && !["approved", "closed"].includes(incident.status)}
          busy={busy} live={live} error={error} onSimulate={simulate} onReset={reset} />
        <MainCard>
          <MapSide>
            <MapToolbar filters={filters} />
            {data && (
              <NetworkMap pharmacy={data.network.pharmacy} views={views} incident={incident}
                focusId={selectedId} route={route} onSelect={select} />
            )}
          </MapSide>
          <Side>
            <ActiveRequest incident={incident} onNewRequest={newRequest} busy={busy === "new"} />
            {incident && <RecommendationCard incident={incident} busy={busy} onDecide={(a, id) => decide(a, id)} />}
            <div id="within-reach">
              <WithinReach views={views} selectedId={selectedId} onSelect={select} hasIncident={!!incident} />
            </div>
          </Side>
        </MainCard>
        <div id="activity">
          <ActivityPanels incident={incident} events={events} />
        </div>
      </Content>
    </AppShell>
  );
}

export function DashboardPage() {
  const { incidentId } = useParams();
  return (
    <DashboardProvider incidentId={incidentId}>
      <Dashboard />
    </DashboardProvider>
  );
}
