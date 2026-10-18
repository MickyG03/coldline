import type { ReactNode } from "react";
import styled from "styled-components";
import type { IconName } from "../theme/icons.ts";
import { Icon } from "./Icon.tsx";

// Left icon rail + top bar around the page content.

const Layout = styled.div`
  display: grid;
  grid-template-columns: ${({ theme }) => theme.sizes.layout.rail} 1fr;
  min-height: 100vh;
`;

const Rail = styled.nav`
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.lg};
  padding: ${({ theme }) => `${theme.sizes.space.xl} 0`};
  border-right: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
  background: ${({ theme }) => theme.palette.background};
`;

const Logo = styled.img`
  width: 40px;
  height: 40px;
  margin-bottom: ${({ theme }) => theme.sizes.space.xxxl};
`;

const RailButton = styled.button<{ $active?: boolean }>`
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border: 0;
  border-radius: ${({ theme }) => theme.border.radius.lg};
  background: ${({ theme, $active }) => ($active ? theme.palette.primaryTint : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.palette.onPrimarySoft : theme.palette.textMuted)};
  cursor: pointer;
  &:hover { color: ${({ theme }) => theme.palette.textPrimary}; }
`;

const Spacer = styled.div`
  flex: 1;
`;

const Main = styled.div`
  min-width: 0;
`;

const TopBar = styled.header`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.xl};
  height: ${({ theme }) => theme.sizes.layout.topBar};
  padding: ${({ theme }) => `0 ${theme.sizes.space.xxxl}`};
  border-bottom: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
`;

const Wordmark = styled.img`
  height: 34px;
`;

const Divider = styled.span`
  width: 1px;
  height: 24px;
  background: ${({ theme }) => theme.palette.border};
`;

const Crumb = styled.span`
  font-size: ${({ theme }) => theme.fonts.size.sm};
  color: ${({ theme }) => theme.palette.textSecondary};
`;

const Workspace = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.sm};
  margin-left: auto;
  font-size: ${({ theme }) => theme.fonts.size.sm};
  color: ${({ theme }) => theme.palette.textSecondary};
  &::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: ${({ theme }) => theme.border.radius.pill};
    background: ${({ theme }) => theme.palette.statusConfirmed};
  }
`;

const Avatar = styled.span`
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.border.radius.pill};
  border: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
  background: ${({ theme }) => theme.palette.panel};
  font-size: ${({ theme }) => theme.fonts.size.xs};
  color: ${({ theme }) => theme.palette.textSecondary};
`;

export interface RailItem { icon: IconName; label: string; active?: boolean; onClick?: () => void }

export function AppShell({ nav, footer, title, children }: {
  nav: RailItem[];
  footer: RailItem[];
  title: string;
  children: ReactNode;
}) {
  const item = (i: RailItem) => (
    <RailButton key={i.label} $active={i.active} onClick={i.onClick} title={i.label} aria-label={i.label}>
      <Icon name={i.icon} size="md" />
    </RailButton>
  );
  return (
    <Layout>
      <Rail>
        <Logo src="/assets/sprout.svg" alt="Coldline" />
        {nav.map(item)}
        <Spacer />
        {footer.map(item)}
      </Rail>
      <Main>
        <TopBar>
          <Wordmark src="/assets/wordmark.svg" alt="coldline" />
          <Divider />
          <Crumb>{title}</Crumb>
          <Workspace>Demo workspace</Workspace>
          <Avatar>MG</Avatar>
        </TopBar>
        {children}
      </Main>
    </Layout>
  );
}
