import styled from "styled-components";
import { Button } from "../../components/Button.tsx";
import { Icon } from "../../components/Icon.tsx";
import { Overline } from "../../components/Text.tsx";
import type { Network } from "../../connection/index.ts";

const Wrap = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.sizes.space.xxl};
  padding: ${({ theme }) => `${theme.sizes.space.xxxl} 0 ${theme.sizes.space.xxl}`};
  border-bottom: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
`;

const Title = styled.h1`
  margin: ${({ theme }) => `${theme.sizes.space.lg} 0 ${theme.sizes.space.sm}`};
  font-size: ${({ theme }) => theme.fonts.size.display};
  font-weight: ${({ theme }) => theme.fonts.weight.regular};
  letter-spacing: ${({ theme }) => theme.fonts.tracking.tight};
  line-height: ${({ theme }) => theme.fonts.lineHeight.tight};
`;

const Sub = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.palette.textSecondary};
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.xxl};
`;

const Place = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.sizes.space.md};
  align-items: center;
  color: ${({ theme }) => theme.palette.textSecondary};
  font-size: ${({ theme }) => theme.fonts.size.sm};
  & small { display: block; font-size: ${({ theme }) => theme.fonts.size.xs}; color: ${({ theme }) => theme.palette.textMuted}; }
`;

export function Hero({ network, onNewRequest, busy }: { network: Network | null; onNewRequest: () => void; busy: boolean }) {
  return (
    <Wrap>
      <div>
        <Overline>+ Care is a connected thing</Overline>
        <Title>A living network.</Title>
        <Sub>The right space. The right people. Within reach.</Sub>
      </div>
      <Right>
        <Place>
          <Icon name="pin" size="md" />
          <div>
            Los Angeles
            <small>Regional care network{network ? ` · ${network.pharmacy.name}` : ""}</small>
          </div>
        </Place>
        <Button $variant="soft" onClick={onNewRequest} disabled={busy}>
          <Icon name="plus" size="md" /> {busy ? "Opening request…" : "New request"}
        </Button>
      </Right>
    </Wrap>
  );
}
