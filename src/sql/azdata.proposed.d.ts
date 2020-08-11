/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// This is the place for API experiments and proposal.

import * as vscode from 'vscode';

declare module 'azdata' {

	export namespace nb {
		export interface IStandardKernel {
			readonly blockedOnSAW?: boolean;
		}
	}

	export interface ComponentWithIconProperties {
		/**
		 * The path for the icon with optional dark-theme away alternative
		 */
		iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri };
		/**
		 * The height of the icon
		 */
		iconHeight?: number | string;
		/**
		 * The width of the icon
		 */
		iconWidth?: number | string;
		/**
		 * The title for the icon. This title will show when hovered over
		 */
		title?: string;
	}

	export interface ComponentWithIcon extends ComponentWithIconProperties {
	}

	export interface ImageComponent extends ComponentWithIcon {
	}

	export interface ImageComponentProperties extends ComponentProperties, ComponentWithIconProperties {
	}

	/**
	 * Panel component with tabs
	 */
	export interface TabbedPanelComponent extends Container<TabbedPanelLayout, any> {
		/**
		 * An event triggered when the selected tab is changed.
		 * The event argument is the id of the selected tab.
		 */
		onTabChanged: vscode.Event<string>;

		/**
		 * update the tabs.
		 * @param tabs new tabs
		 */
		updateTabs(tabs: (Tab | TabGroup)[]): void;

		/**
		 * Selects the tab with the specified id
		 * @param id The id of the tab to select
		 */
		selectTab(id: string): void;
	}

	/**
	 * Defines the tab orientation of TabbedPanelComponent
	 */
	export enum TabOrientation {
		Vertical = 'vertical',
		Horizontal = 'horizontal'
	}

	/**
	 * Layout of TabbedPanelComponent, can be used to initialize the component when using ModelBuilder
	 */
	export interface TabbedPanelLayout {
		/**
		 * Tab orientation. Default horizontal.
		 */
		orientation?: TabOrientation;

		/**
		 * Whether to show the tab icon. Default false.
		 */
		showIcon?: boolean;

		/**
		 * Whether to show the tab navigation pane even when there is only one tab. Default false.
		 */
		alwaysShowTabs?: boolean;
	}

	/**
	 * Represents the tab of TabbedPanelComponent
	 */
	export interface Tab {
		/**
		 * Title of the tab
		 */
		title: string;

		/**
		 * Content component of the tab
		 */
		content: Component;

		/**
		 * Id of the tab
		 */
		id: string;

		/**
		 * Icon of the tab
		 */
		icon?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri };
	}

	/**
	 * Represents the tab group of TabbedPanelComponent
	 */
	export interface TabGroup {
		/**
		 * Title of the tab group
		 */
		title: string;

		/**
		 * children of the tab group
		 */
		tabs: Tab[];
	}

	/**
	 * Builder for TabbedPannelComponent
	 */
	export interface TabbedPanelComponentBuilder extends ContainerBuilder<TabbedPanelComponent, TabbedPanelLayout, any> {
		/**
		 * Add the tabs to the component
		 * @param tabs tabs/tab groups to be added
		 */
		withTabs(tabs: (Tab | TabGroup)[]): ContainerBuilder<TabbedPanelComponent, TabbedPanelLayout, any>;
	}

	export interface InputBoxProperties extends ComponentProperties {
		validationErrorMessage?: string;
		readOnly?: boolean;
	}

	export interface CheckBoxProperties {
		required?: boolean;
	}

	/**
	 * A property to be displayed in the PropertiesContainerComponent
	 */
	export interface PropertiesContainerItem {
		/**
		 * The name of the property to display
		 */
		displayName: string;
		/**
		 * The value of the property to display
		 */
		value: string;
	}

	/**
	 * Component to display a list of property values.
	 */
	export interface PropertiesContainerComponent extends Component, PropertiesContainerComponentProperties {

	}

	/**
	 * Properties for configuring a PropertiesContainerComponent
	 */
	export interface PropertiesContainerComponentProperties {
		/**
		 * The properties to display
		 */
		propertyItems?: PropertiesContainerItem[];
	}

	export namespace nb {
		/**
		 * An event that is emitted when the active Notebook editor is changed.
		 */
		export const onDidChangeActiveNotebookEditor: vscode.Event<NotebookEditor>;
	}

	export namespace window {
		export interface ModelViewDashboard {
			registerTabs(handler: (view: ModelView) => Thenable<(DashboardTab | DashboardTabGroup)[]>): void;
			open(): Thenable<void>;
			updateTabs(tabs: (DashboardTab | DashboardTabGroup)[]): void;
			selectTab(id: string): void;
		}

		export function createModelViewDashboard(title: string, options?: ModelViewDashboardOptions): ModelViewDashboard;

		export interface Dialog {
			/**
			 * Width of the dialog
			 */
			width?: DialogWidth;
		}

		export interface Wizard {
			/**
			 * Width of the wizard
			 */
			width?: DialogWidth;
		}

		export type DialogWidth = 'narrow' | 'medium' | 'wide' | number;

		/**
		 * Create a dialog with the given title
		 * @param title The title of the dialog, displayed at the top
		 * @param dialogName the name of the dialog
		 * @param width width of the dialog, default is 'wide'
		 */
		export function createModelViewDialog(title: string, dialogName?: string, width?: DialogWidth): Dialog;

		/**
		 * Create a wizard with the given title and width
		 * @param title The title of the wizard
		 * @param width The width of the wizard, default value is 'narrow'
		 */
		export function createWizard(title: string, width?: DialogWidth): Wizard;
	}

	export interface DashboardTab extends Tab {
		/**
		 * Toolbar of the tab, optional.
		 */
		toolbar?: ToolbarContainer;
	}

	export interface DashboardTabGroup {
		/**
		 * * Title of the tab group
		 */
		title: string;

		/**
		 * children of the tab group
		 */
		tabs: DashboardTab[];
	}

	export interface ModelViewDashboardOptions {
		/**
		 * Whether to show the tab icon, default is true
		 */
		showIcon?: boolean;

		/**
		 * Whether to show the tab navigation pane even when there is only one tab, default is false
		 */
		alwaysShowTabs?: boolean;
	}

	export interface Container<TLayout, TItemLayout> extends Component {
		setItemLayout(component: Component, layout: TItemLayout): void;
	}

	export interface TaskInfo {
		targetLocation?: string;
	}

	export interface ButtonColumnOption {
		icon?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri };
	}

	export interface ButtonCell extends TableCell {
		columnName: string;
	}

	export namespace sqlAssessment {

		export enum SqlAssessmentTargetType {
			Server = 1,
			Database = 2
		}

		export enum SqlAssessmentResultItemKind {
			RealResult = 0,
			Warning = 1,
			Error = 2
		}
	}
	// Assessment interfaces

	export interface SqlAssessmentResultItem {
		rulesetVersion: string;
		rulesetName: string;
		targetType: sqlAssessment.SqlAssessmentTargetType;
		targetName: string;
		checkId: string;
		tags: string[];
		displayName: string;
		description: string;
		message: string;
		helpLink: string;
		level: string;
		timestamp: string;
		kind: sqlAssessment.SqlAssessmentResultItemKind;
	}

	export interface SqlAssessmentResult extends ResultStatus {
		items: SqlAssessmentResultItem[];
		apiVersion: string;
	}

	export interface SqlAssessmentServicesProvider extends DataProvider {
		assessmentInvoke(ownerUri: string, targetType: sqlAssessment.SqlAssessmentTargetType): Promise<SqlAssessmentResult>;
		getAssessmentItems(ownerUri: string, targetType: sqlAssessment.SqlAssessmentTargetType): Promise<SqlAssessmentResult>;
		generateAssessmentScript(items: SqlAssessmentResultItem[]): Promise<ResultStatus>;
	}

	export interface TreeItem2 extends vscode.TreeItem2 {
		payload?: IConnectionProfile;
		childProvider?: string;
		type?: ExtensionNodeType;
	}

	export interface AccountDisplayInfo {
		email?: string;
		name?: string;
	}

	export interface AccountProvider {
		/**
		 * Generates a security token for the provided account and tenant
		 * @param account The account to generate a security token for
		 * @param resource The resource to get the token for
		 * @return Promise to return a security token object
		 */
		getAccountSecurityToken(account: Account, tenant: string, resource: AzureResource): Thenable<{ token: string } | undefined>;
	}

	export interface AccountKey {
		/**
		 * A version string for an account
		 */
		accountVersion?: string;
	}

	export interface Account {
		/**
		 * Specifies if an account should be deleted
		 */
		delete?: boolean;
	}

}
