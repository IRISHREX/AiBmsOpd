import useSound from 'use-sound';

const useClickSound = () => {
    const [play] = useSound('/click.mp3');

    const setupClickSound = (elementOrEvent) => {
        if (!elementOrEvent || typeof elementOrEvent.addEventListener !== 'function') {
            // Direct call to play the click sound
            try {
                play();
            } catch (e) {
                // Ignore audio autoplay restrictions
            }
            return;
        }

        const handler = () => {
            try {
                play();
            } catch (e) {}
        };
        
        elementOrEvent.addEventListener('click', handler);

        return () => {
            elementOrEvent.removeEventListener('click', handler);
        };
    };

    setupClickSound.play = play;

    return setupClickSound;
};

export default useClickSound;

