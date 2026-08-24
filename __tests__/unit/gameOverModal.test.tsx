import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GameOverModal } from '@/components/GameOverModal';
import { useGameStore } from '@/store/gameStore';
import { EndingCause, LegacyReport } from '@/types/game';
import { ENDINGS } from '@/constants/endings';

describe('GameOverModal - Fatal Narrative & Legacy Succession', () => {
  beforeEach(() => {
    useGameStore.setState({
      gameOver: false,
      activeEnding: null,
      legacyReport: null,
    });
  });

  describe('1. Visibility', () => {
    it('is hidden by default when gameOver is false', () => {
      const { queryByTestId } = render(<GameOverModal />);
      expect(queryByTestId('game-over-title')).toBeNull();
      expect(queryByTestId('btn-continue-generation')).toBeNull();
    });

    it('is visible when isOpen prop is true', () => {
      const { getByTestId } = render(<GameOverModal isOpen={true} />);
      expect(getByTestId('game-over-title')).toBeTruthy();
      expect(getByTestId('btn-continue-generation')).toBeTruthy();
    });
  });

  describe('2. Ending Narrative Details', () => {
    it('renders ending title and description from active ending', () => {
      const sampleEnding: EndingCause = ENDINGS.policia_100;

      const { getByTestId } = render(
        <GameOverModal isOpen={true} ending={sampleEnding} />
      );

      expect(getByTestId('game-over-title')).toHaveTextContent('BUSTED');
      expect(getByTestId('game-over-description')).toHaveTextContent(
        sampleEnding.description
      );
    });

    it('uses fallback title and description if ending is null', () => {
      const { getByTestId } = render(
        <GameOverModal isOpen={true} ending={null} />
      );

      expect(getByTestId('game-over-title')).toHaveTextContent('FIN DEL IMPERIO');
    });
  });

  describe('3. Legacy Report Breakdown', () => {
    it('renders inherited stat modifiers and trait breakdown rows', () => {
      const sampleLegacy: LegacyReport = {
        dDinero: 24,
        dPolicia: 15,
        dEstres: 10,
        dRespeto: 5,
        rows: [
          ['Hotel Boutique (Lavado Activo)', 24],
          ['Redadas constantes del FIB', 15],
        ],
        generation: 1,
        yearsInPower: 18,
        moneyLaundered: 240000,
        causeOfDeath: 'Busted',
      };

      const { getByTestId } = render(
        <GameOverModal
          isOpen={true}
          ending={ENDINGS.policia_100}
          legacyReport={sampleLegacy}
        />
      );

      expect(getByTestId('legacy-report-container')).toBeTruthy();
      expect(getByTestId('legacy-stat-dinero')).toHaveTextContent('+24');
      expect(getByTestId('legacy-stat-policia')).toHaveTextContent('+15');
      expect(getByTestId('legacy-stat-estres')).toHaveTextContent('+10');
      expect(getByTestId('legacy-stat-respeto')).toHaveTextContent('+5');

      expect(getByTestId('legacy-row-0')).toHaveTextContent(
        'Hotel Boutique (Lavado Activo)'
      );
      expect(getByTestId('legacy-row-0')).toHaveTextContent('+24');
      expect(getByTestId('legacy-row-1')).toHaveTextContent(
        'Redadas constantes del FIB'
      );
      expect(getByTestId('legacy-row-1')).toHaveTextContent('+15');
    });
  });

  describe('4. Starting Next Generation Flow', () => {
    it('triggers onContinue when clicking the continue button', () => {
      const onContinueMock = jest.fn();
      const { getByTestId } = render(
        <GameOverModal isOpen={true} onContinue={onContinueMock} />
      );

      const continueBtn = getByTestId('btn-continue-generation');
      fireEvent.press(continueBtn);

      expect(onContinueMock).toHaveBeenCalledTimes(1);
    });
  });
});
