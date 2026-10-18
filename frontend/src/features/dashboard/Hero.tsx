import styled from "styled-components";

// Headline that sits beside the wordmark in the top bar.

const Title = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.fonts.size.xxl};
  font-weight: ${({ theme }) => theme.fonts.weight.regular};
  letter-spacing: ${({ theme }) => theme.fonts.tracking.tight};
  line-height: ${({ theme }) => theme.fonts.lineHeight.tight};
  white-space: nowrap;
`;

const Sub = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fonts.size.sm};
  color: ${({ theme }) => theme.palette.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export function Hero() {
  return (
    <>
      <Title>A living network.</Title>
      <Sub>The right space. The right people. Within reach.</Sub>
    </>
  );
}
