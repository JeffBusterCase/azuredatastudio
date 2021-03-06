/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as azdata from 'azdata';
import * as azdataExt from 'azdata-ext';
import * as vscode from 'vscode';
import { ResourceModel } from './resourceModel';
import { ResourceInfo, Registration, ControllerModel } from './controllerModel';
import { AzureArcTreeDataProvider } from '../ui/tree/azureArcTreeDataProvider';
import { Deferred } from '../common/promise';
import * as loc from '../localizedConstants';
import { UserCancelledError } from '../common/utils';

export type DatabaseModel = { name: string, status: string };

export class MiaaModel extends ResourceModel {

	private _config: azdataExt.SqlMiShowResult | undefined;
	private _databases: DatabaseModel[] = [];
	// The saved connection information
	private _connectionProfile: azdata.IConnectionProfile | undefined = undefined;
	// The ID of the active connection used to query the server
	private _activeConnectionId: string | undefined = undefined;

	private readonly _onConfigUpdated = new vscode.EventEmitter<azdataExt.SqlMiShowResult | undefined>();
	private readonly _onDatabasesUpdated = new vscode.EventEmitter<DatabaseModel[]>();
	private readonly _azdataApi: azdataExt.IExtension;
	public onConfigUpdated = this._onConfigUpdated.event;
	public onDatabasesUpdated = this._onDatabasesUpdated.event;
	public configLastUpdated?: Date;
	public databasesLastUpdated?: Date;

	private _refreshPromise: Deferred<void> | undefined = undefined;

	constructor(private _controllerModel: ControllerModel, info: ResourceInfo, registration: Registration, private _treeDataProvider: AzureArcTreeDataProvider) {
		super(info, registration);
		this._azdataApi = <azdataExt.IExtension>vscode.extensions.getExtension(azdataExt.extension.name)?.exports;
	}

	/**
	 * The username used to connect to this instance
	 */
	public get username(): string | undefined {
		return this._connectionProfile?.userName;
	}

	/**
	 * The status of this instance
	 */
	public get config(): azdataExt.SqlMiShowResult | undefined {
		return this._config;
	}

	/**
	 * The cluster endpoint of this instance
	 */
	public get clusterEndpoint(): string {
		return ''; // TODO chgagnon
		// return this._config?.cluster_endpoint || '';
	}

	public get databases(): DatabaseModel[] {
		return this._databases;
	}

	/** Refreshes the model */
	public async refresh(): Promise<void> {
		// Only allow one refresh to be happening at a time
		if (this._refreshPromise) {
			return this._refreshPromise.promise;
		}
		this._refreshPromise = new Deferred();
		try {
			await this._controllerModel.azdataLogin();
			const instanceRefresh = this._azdataApi.azdata.arc.sql.mi.show(this.info.name).then(result => {
				this._config = result.result;
				this.configLastUpdated = new Date();
				this._onConfigUpdated.fire(this._config);
			}).catch(err => {
				// If an error occurs show a message so the user knows something failed but still
				// fire the event so callers can know to update (e.g. so dashboards don't show the
				// loading icon forever)
				vscode.window.showErrorMessage(loc.fetchConfigFailed(this.info.name, err));
				this.configLastUpdated = new Date();
				this._onConfigUpdated.fire(undefined);
				throw err;
			});
			const promises: Thenable<any>[] = [instanceRefresh];
			try {
				await this.getConnectionProfile();
				if (this._connectionProfile) {
					// We haven't connected yet so do so now and then store the ID for the active connection
					if (!this._activeConnectionId) {
						const result = await azdata.connection.connect(this._connectionProfile, false, false);
						if (!result.connected) {
							throw new Error(result.errorMessage);
						}
						this._activeConnectionId = result.connectionId;
					}

					const provider = azdata.dataprotocol.getProvider<azdata.MetadataProvider>(this._connectionProfile.providerName, azdata.DataProviderType.MetadataProvider);
					const databasesRefresh = azdata.connection.getUriForConnection(this._activeConnectionId).then(ownerUri => {
						provider.getDatabases(ownerUri).then(databases => {
							if (!databases) {
								throw new Error('Could not fetch databases');
							}
							if (databases.length > 0 && typeof (databases[0]) === 'object') {
								this._databases = (<azdata.DatabaseInfo[]>databases).map(db => { return { name: db.options['name'], status: db.options['state'] }; });
							} else {
								this._databases = (<string[]>databases).map(db => { return { name: db, status: '-' }; });
							}
							this.databasesLastUpdated = new Date();
							this._onDatabasesUpdated.fire(this._databases);
						});
					});
					promises.push(databasesRefresh);
				}
			} catch (err) {
				// If an error occurs show a message so the user knows something failed but still
				// fire the event so callers can know to update (e.g. so dashboards don't show the
				// loading icon forever)
				if (err instanceof UserCancelledError) {
					vscode.window.showWarningMessage(loc.connectionRequired);
				} else {
					vscode.window.showErrorMessage(loc.fetchDatabasesFailed(this.info.name, err));
				}
				this.databasesLastUpdated = new Date();
				this._onDatabasesUpdated.fire(this._databases);
				throw err;
			}

			await Promise.all(promises);
			this._refreshPromise.resolve();
		} catch (err) {
			this._refreshPromise.reject(err);
			throw err;
		} finally {
			this._refreshPromise = undefined;
		}
	}

	/**
	 * Loads the saved connection profile associated with this model. Will prompt for one if
	 * we don't have one or can't find it (it was deleted)
	 */
	private async getConnectionProfile(): Promise<void> {
		if (this._connectionProfile) {
			return;
		}
		let connection: azdata.connection.ConnectionProfile | azdata.connection.Connection | undefined;

		if (this.info.connectionId) {
			try {
				const connections = await azdata.connection.getConnections();
				const existingConnection = connections.find(conn => conn.connectionId === this.info.connectionId);
				if (existingConnection) {
					const credentials = await azdata.connection.getCredentials(this.info.connectionId);
					if (credentials) {
						existingConnection.options['password'] = credentials.password;
						connection = existingConnection;
					} else {
						// We need the password so prompt the user for it
						const connectionProfile: azdata.IConnectionProfile = {
							serverName: existingConnection.options['serverName'],
							databaseName: existingConnection.options['databaseName'],
							authenticationType: existingConnection.options['authenticationType'],
							providerName: 'MSSQL',
							connectionName: '',
							userName: existingConnection.options['user'],
							password: '',
							savePassword: false,
							groupFullName: undefined,
							saveProfile: true,
							id: '',
							groupId: undefined,
							options: existingConnection.options
						};
						connection = await azdata.connection.openConnectionDialog(['MSSQL'], connectionProfile);
					}
				}
			} catch (err) {
				// ignore - the connection may not necessarily exist anymore and in that case we'll just reprompt for a connection
			}
		}

		if (!connection) {
			// We need the password so prompt the user for it
			const connectionProfile: azdata.IConnectionProfile = {
				// TODO chgagnon fill in external IP and port
				// serverName: (this.registration.externalIp && this.registration.externalPort) ? `${this.registration.externalIp},${this.registration.externalPort}` : '',
				serverName: '',
				databaseName: '',
				authenticationType: 'SqlLogin',
				providerName: 'MSSQL',
				connectionName: '',
				userName: 'sa',
				password: '',
				savePassword: true,
				groupFullName: undefined,
				saveProfile: true,
				id: '',
				groupId: undefined,
				options: {}
			};
			// Weren't able to load the existing connection so prompt user for new one
			connection = await azdata.connection.openConnectionDialog(['MSSQL'], connectionProfile);
		}

		if (connection) {
			const profile = {
				// The option name might be different here based on where it came from
				serverName: connection.options['serverName'] || connection.options['server'],
				databaseName: connection.options['databaseName'] || connection.options['database'],
				authenticationType: connection.options['authenticationType'],
				providerName: 'MSSQL',
				connectionName: '',
				userName: connection.options['user'],
				password: connection.options['password'],
				savePassword: false,
				groupFullName: undefined,
				saveProfile: true,
				id: connection.connectionId,
				groupId: undefined,
				options: connection.options
			};
			this.updateConnectionProfile(profile);
		} else {
			throw new UserCancelledError();
		}
	}

	private async updateConnectionProfile(connectionProfile: azdata.IConnectionProfile): Promise<void> {
		this._connectionProfile = connectionProfile;
		this.info.connectionId = connectionProfile.id;
		await this._treeDataProvider.saveControllers();
	}
}
