import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PartnerBadge } from '@/components/PartnerBadge';
import { useGameStore } from '@/store/gameStore';
import { INITIAL_PARTNER_A, INITIAL_PARTNER_B } from '@/constants/characters';

describe('PartnerBadge - Active Protagonist & Duo Indicator', () => {
  beforeEach(() => {
    useGameStore.setState({
      activePartner: 'partnerA',
      partnerA: INITIAL_PARTNER_A,
      partnerB: INITIAL_PARTNER_B,
    });
  });

  describe('1. Active Partner Rendering', () => {
    it('renders partnerA as active by default', () => {
      const { getByTestId, getByText } = render(<PartnerBadge />);

      expect(getByTestId('partner-badge')).toBeTruthy();
      expect(getByTestId('active-partner-name')).toHaveTextContent('Nico');
      expect(getByTestId('active-partner-role')).toHaveTextContent('El Estratega');
      expect(getByTestId('active-partner-status')).toHaveTextContent('ACTIVO');
    });

    it('renders partnerB as active when set in props or store', () => {
      const { getByTestId } = render(
        <PartnerBadge activePartner="partnerB" />
      );

      expect(getByTestId('active-partner-name')).toHaveTextContent('Camila');
      expect(getByTestId('active-partner-role')).toHaveTextContent('La Ejecutora');
    });

    it('displays status label correctly for dead or jailed partner', () => {
      const { getByTestId, getByText } = render(
        <PartnerBadge
          activePartner="partnerB"
          partnerA={{ ...INITIAL_PARTNER_A, status: 'dead' }}
          partnerB={INITIAL_PARTNER_B}
        />
      );

      expect(getByText('[MUERTO]')).toBeTruthy();
    });
  });

  describe('2. Switching Partners Manually', () => {
    it('triggers onSwitchPartner when clicking the inactive partner pill', () => {
      const onSwitchMock = jest.fn();
      const { getByTestId } = render(
        <PartnerBadge activePartner="partnerA" onSwitchPartner={onSwitchMock} />
      );

      const pillB = getByTestId('partner-tag-partnerB');
      fireEvent.press(pillB);

      expect(onSwitchMock).toHaveBeenCalledTimes(1);
    });

    it('does not trigger switch if the partner is dead', () => {
      const onSwitchMock = jest.fn();
      const { getByTestId } = render(
        <PartnerBadge
          activePartner="partnerA"
          partnerA={INITIAL_PARTNER_A}
          partnerB={{ ...INITIAL_PARTNER_B, status: 'dead' }}
          onSwitchPartner={onSwitchMock}
        />
      );

      const pillB = getByTestId('partner-tag-partnerB');
      fireEvent.press(pillB);

      expect(onSwitchMock).not.toHaveBeenCalled();
    });
  });
});
