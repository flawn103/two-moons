import React from "react";
import styles from "./index.module.scss";
import { useContext } from "react";
import { observer } from "mobx-react";
import { RollContext } from "../../Roll";
import classNames from "classnames";
import { MoaTone } from "../../../../utils/MoaTone";

export const Controller: React.FC<{
  controllers: Record<string, boolean>;
}> = observer(({ controllers = {} }) => {
  const store = useContext(RollContext);

  return (
    <div className={styles.controller}>
      {store.bpm && (
        <div className={styles.bpm}>
          <label>bpm: {store.bpm}</label>
          <input
            type="range"
            min={40}
            max={200}
            value={store.bpm}
            onInput={(e) => {
              store.setBpm(Number((e.target as HTMLInputElement).value));
            }}
          />
        </div>
      )}
      {store.keyboardPiano && (
        <div className={styles.keyboard}>
          <label>keys octave: {store.keyboardOctave}</label>

          <div
            className={classNames(styles.btn)}
            onClick={() => store.setKeyboardOctave(store.keyboardOctave + 1)}
          >
            ↑
          </div>
          <div
            className={classNames(styles.btn)}
            onClick={() => store.setKeyboardOctave(store.keyboardOctave - 1)}
          >
            ↓
          </div>
        </div>
      )}

      {controllers.octave !== false && (
        <div className={styles.octave}>
          <label>top octave: </label>
          <div className={styles.row}>
            <div
              className={classNames(styles.btn)}
              onClick={() => store.changeCurrentTrackOctave("top", 1)}
            >
              ↑
            </div>
            <div
              className={classNames(styles.btn)}
              onClick={() => store.changeCurrentTrackOctave("top", -1)}
            >
              ↓
            </div>
          </div>

          <label>bottom octave: </label>
          <div className={styles.row}>
            <div
              className={classNames(styles.btn)}
              onClick={() => store.changeCurrentTrackOctave("bottom", 1)}
            >
              ↑
            </div>
            <div
              className={classNames(styles.btn)}
              onClick={() => store.changeCurrentTrackOctave("bottom", -1)}
            >
              ↓
            </div>
          </div>
        </div>
      )}

      {controllers.length !== false && (
        <div className={styles.length}>
          <label>length: {store.timeLength}</label>
          <div className={styles.row}>
            <span
              className={classNames(styles.btn)}
              onClick={() => store.setTimeLenth(store.keyboardLength - 4)}
            >
              -
            </span>
            <span
              className={classNames(styles.btn)}
              onClick={() => store.setTimeLenth(store.keyboardLength + 4)}
            >
              +
            </span>
          </div>
        </div>
      )}

      {controllers.clear !== false && (
        <div
          onClick={() => store.clearTrack()}
          className={classNames(styles.btn)}
        >
          clear
        </div>
      )}

      {store.status === "playing" ? (
        <div onClick={() => store.stop()} className={classNames(styles.btn)}>
          stop
        </div>
      ) : (
        <div
          onClick={() => {
            MoaTone.Transport.bpm = store.bpm;
            store.play();
          }}
          className={classNames(styles.btn)}
        >
          play
        </div>
      )}
    </div>
  );
});
