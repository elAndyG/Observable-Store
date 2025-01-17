import { BehaviorSubject, Observable } from 'rxjs';
import { ObservableStoreSettings, StateHistory, ObservableStoreGlobalSettings, StateWithPropertyChanges } from './interfaces';
import ObservableStoreBase from './observable-store-base';

/**
 * Executes a function on `state` and returns a version of T
 * @param state - the original state model
 */
export type stateFunc<T> = (state: T) => Partial<T>;

/**
 * Core functionality for ObservableStore
 * providing getState(), setState() and additional functionality
 */
export class ObservableStore<T> {
    // Not a fan of using _ for private fields in TypeScript, but since 
    // some may use this as pure ES2015 I'm going with _ for the private fields.
    // private _stateDispatcher$ = new BehaviorSubject<T>(null);
    private _settings: ObservableStoreSettings;
    private _stateDispatcher$ = new BehaviorSubject<T>(null);
    private _stateWithChangesDispatcher$ = new BehaviorSubject<StateWithPropertyChanges<T>>(null);

    stateChanged: Observable<T>;
    stateWithPropertyChanges: Observable<StateWithPropertyChanges<T>>;
    globalStateChanged: Observable<T>;
    globalStateWithPropertyChanges: Observable<StateWithPropertyChanges<T>>;
    
    get stateHistory(): StateHistory<T>[] {
        return ObservableStoreBase.stateHistory;
    }

    constructor(settings: ObservableStoreSettings) {
        this._settings = { ...ObservableStoreBase.settingsDefaults, ...settings, ...ObservableStoreBase.globalSettings };        
        this.stateChanged = this._stateDispatcher$.asObservable();
        this.globalStateChanged = ObservableStoreBase.globalStateDispatcher.asObservable();

        this.stateWithPropertyChanges = this._stateWithChangesDispatcher$.asObservable();
        this.globalStateWithPropertyChanges = ObservableStoreBase.globalStateWithChangesDispatcher.asObservable();
    }

    static get globalSettings() {
        return ObservableStoreBase.globalSettings;
    }

    static set globalSettings(settings: ObservableStoreGlobalSettings) {
        // ObservableStore['isTesting'] used so that unit tests can set globalSettings 
        // multiple times during a suite of tests
        if (settings && (ObservableStore['isTesting'] || !ObservableStoreBase.globalSettings)) {
            ObservableStoreBase.globalSettings = settings;
        }
        else if (!settings) {
            throw new Error('Please provide the global settings you would like to apply to Observable Store');
        }
        else if (settings && ObservableStoreBase.globalSettings) {
            throw new Error('Observable Store global settings may only be set once when the application first loads.');
        }
    }

    protected getState() : T {
        return this._getStateOrSlice();
    }

    protected setState(state: Partial<T> | stateFunc<T>, 
        action?: string, 
        dispatchState: boolean = true) : T { 

        // Needed for tracking below (don't move or delete)
        const previousState = this.getState();

        switch (typeof state) {
            case 'function':
                const newState = state(this.getState());
                this._updateState(newState);
                break;
            case 'object':
                this._updateState(state);
                break;
            default:
                throw Error('Pass an object or a function for the state parameter when calling setState().');
        }
        
        if (dispatchState) {
            this._dispatchState(state as any);
        }

        if (this._settings.trackStateHistory) {
            ObservableStoreBase.stateHistory.push({ 
                action, 
                beginState: previousState, 
                endState: this.getState() 
            });
        }

        if (this._settings.logStateChanges) {
            const caller = (this.constructor) ? '\r\nCaller: ' + this.constructor.name : '';
            console.log('%cSTATE CHANGED', 'font-weight: bold', '\r\nAction: ', action, caller, '\r\nState: ', state);
        }

        return this.getState();
    }

    protected logStateAction(state: any, action: string) {
        if (this._settings.trackStateHistory) {
            ObservableStoreBase.stateHistory.push({ 
                action, 
                beginState: this.getState(), 
                endState: ObservableStoreBase.deepClone(state) 
            });
        }
    }

    protected resetStateHistory() {
        ObservableStoreBase.stateHistory = [];
    }

    private _updateState(state: Partial<T>) {
        ObservableStoreBase.setStoreState(state);
    }

    private _getStateOrSlice(): Readonly<Partial<T>> {
        const storeState = ObservableStoreBase.getStoreState();
        if (this._settings.stateSliceSelector) {
            return this._settings.stateSliceSelector(storeState);
        }
        return storeState;
    }

    private _dispatchState(stateChanges: Partial<T>) {       
        // Get store state or slice of state
        const clonedStateOrSlice = this._getStateOrSlice();

        //  Get full store state
        const clonedGlobalState = ObservableStoreBase.getStoreState();

        // includeStateChangesOnSubscribe is deprecated
        if (this._settings.includeStateChangesOnSubscribe) {
            console.log('includeStateChangesOnSubscribe is deprecated. ' +
                        'Subscribe to stateChangedWithChanges or globalStateChangedWithChanges instead.');
            this._stateDispatcher$.next({ state: clonedStateOrSlice, stateChanges } as any);
            ObservableStoreBase.globalStateDispatcher.next({ state: clonedGlobalState, stateChanges });
        }
        else {
            // send out standard state
            this._stateDispatcher$.next(clonedStateOrSlice);
            ObservableStoreBase.globalStateDispatcher.next(clonedGlobalState);

            // send out StateWithChanges<T>
            this._stateWithChangesDispatcher$.next({ state: clonedStateOrSlice, stateChanges });
            ObservableStoreBase.globalStateWithChangesDispatcher.next({ state: clonedGlobalState, stateChanges });
        }
    }

}
