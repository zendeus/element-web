/*
Copyright 2024 New Vector Ltd.
Copyright 2021-2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, {
    type JSX,
    type MouseEvent,
    type ComponentProps,
    type ComponentType,
    type InputHTMLAttributes,
    type LegacyRef,
    type RefObject,
} from "react";
import classNames from "classnames";
import { type Room, RoomEvent } from "matrix-js-sdk/src/matrix";
import { KnownMembership } from "matrix-js-sdk/src/types";
import { type DraggableProvidedDragHandleProps } from "react-beautiful-dnd";
import { OverflowHorizontalIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import RoomAvatar from "../avatars/RoomAvatar";
import SpaceStore from "../../../stores/spaces/SpaceStore";
import { type SpaceKey } from "../../../stores/spaces";
import NotificationBadge from "../rooms/NotificationBadge";
import { _t } from "../../../languageHandler";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import { ContextMenuTooltipButton } from "../../../accessibility/context_menu/ContextMenuTooltipButton";
import { toRightOf, useContextMenu } from "../../structures/ContextMenu";
import AccessibleButton, {
    type ButtonEvent,
    type ButtonProps as AccessibleButtonProps,
} from "../elements/AccessibleButton";
import { StaticNotificationState } from "../../../stores/notifications/StaticNotificationState";
import { NotificationLevel } from "../../../stores/notifications/NotificationLevel";
import { type NotificationState } from "../../../stores/notifications/NotificationState";
import SpaceContextMenu from "../context_menus/SpaceContextMenu";
import { useRovingTabIndex } from "../../../accessibility/RovingTabIndex";

type ButtonProps<T extends keyof HTMLElementTagNameMap> = Omit<
    AccessibleButtonProps<T>,
    "title" | "onClick" | "size" | "element" | "ref"
> & {
    space?: Room;
    spaceKey?: SpaceKey;
    className?: string;
    selected?: boolean;
    label: string;
    icon?: JSX.Element;
    contextMenuTooltip?: string;
    notificationState?: NotificationState;
    isNarrow?: boolean;
    size: string;
    innerRef?: RefObject<HTMLDivElement | null>;
    ContextMenuComponent?: ComponentType<ComponentProps<typeof SpaceContextMenu>>;
    onClick?(ev?: ButtonEvent): void;
};

export const SpaceButton = <T extends keyof HTMLElementTagNameMap>({
    space,
    spaceKey: _spaceKey,
    className,
    icon,
    selected,
    label,
    contextMenuTooltip,
    notificationState,
    size,
    isNarrow,
    children,
    innerRef,
    ContextMenuComponent,
    ...props
}: ButtonProps<T>): JSX.Element => {
    const [menuDisplayed, handle, openMenu, closeMenu] = useContextMenu<HTMLDivElement>(innerRef);
    const [onFocus, isActive, ref] = useRovingTabIndex<HTMLDivElement>(handle);
    const tabIndex = isActive ? 0 : -1;

    const spaceKey = _spaceKey ?? space?.roomId;

    let avatar = (
        <div className="mx_SpaceButton_avatarPlaceholder">
            <div className="mx_SpaceButton_icon">{icon}</div>
        </div>
    );
    if (space) {
        avatar = <RoomAvatar size={size} room={space} type="square" />;
    }

    let notifBadge;
    if (spaceKey && notificationState) {
        let ariaLabel = _t("a11y_jump_first_unread_room");
        if (space?.getMyMembership() === KnownMembership.Invite) {
            ariaLabel = _t("a11y|jump_first_invite");
        }

        const jumpToNotification = (ev: MouseEvent): void => {
            ev.stopPropagation();
            ev.preventDefault();
            SpaceStore.instance.setActiveRoomInSpace(spaceKey);
        };

        notifBadge = (
            <div className="mx_SpacePanel_badgeContainer">
                <NotificationBadge
                    onClick={jumpToNotification}
                    notification={notificationState}
                    aria-label={ariaLabel}
                    tabIndex={tabIndex}
                    showUnsentTooltip={true}
                />
            </div>
        );
    }

    let contextMenu: JSX.Element | undefined;
    if (menuDisplayed && handle.current && ContextMenuComponent) {
        contextMenu = (
            <ContextMenuComponent
                {...toRightOf(handle.current.getBoundingClientRect(), 0)}
                space={space}
                onFinished={closeMenu}
            />
        );
    }

    const viewSpaceHome = (): void =>
        // space is set here because of the assignment condition of onClick
        defaultDispatcher.dispatch({ action: Action.ViewRoom, room_id: space!.roomId });
    const activateSpace = (): void => {
        if (spaceKey) SpaceStore.instance.setActiveSpace(spaceKey);
    };
    const onClick = props.onClick ?? (selected && space ? viewSpaceHome : activateSpace);

    return (
        <AccessibleButton
            {...props}
            className={classNames("mx_SpaceButton", className, {
                mx_SpaceButton_active: selected,
                mx_SpaceButton_hasMenuOpen: menuDisplayed,
                mx_SpaceButton_narrow: isNarrow,
                mx_SpaceButton_withIcon: Boolean(icon),
            })}
            aria-label={label}
            title={!isNarrow || menuDisplayed ? undefined : label}
            onClick={onClick}
            onContextMenu={openMenu}
            ref={ref}
            tabIndex={tabIndex}
            onFocus={onFocus}
        >
            {children}
            <div className="mx_SpaceButton_selectionWrapper">
                <div className="mx_SpaceButton_avatarWrapper">
                    {avatar}
                    {notifBadge}
                </div>
                {!isNarrow && <span className="mx_SpaceButton_name">{label}</span>}

                {ContextMenuComponent && (
                    <ContextMenuTooltipButton
                        className="mx_SpaceButton_menuButton"
                        onClick={openMenu}
                        title={contextMenuTooltip}
                        isExpanded={menuDisplayed}
                    >
                        <OverflowHorizontalIcon />
                    </ContextMenuTooltipButton>
                )}

                {contextMenu}
            </div>
        </AccessibleButton>
    );
};

interface IItemProps extends InputHTMLAttributes<HTMLLIElement> {
    space: Room;
    activeSpaces: SpaceKey[];
    isNested?: boolean;
    isPanelCollapsed?: boolean;
    onExpand?: () => void;
    parents?: Set<string>;
    innerRef?: LegacyRef<HTMLLIElement>;
    dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

interface IItemState {
    name: string;
    collapsed: boolean;
    childSpaces: Room[];
}

export class SpaceItem extends React.PureComponent<IItemProps, IItemState> {
    public constructor(props: IItemProps) {
        super(props);

        this.state = {
            name: this.props.space.name,
            collapsed: false,
            childSpaces: this.childSpaces,
        };
    }

    public componentDidMount(): void {
        SpaceStore.instance.on(this.props.space.roomId, this.onSpaceUpdate);
        this.props.space.on(RoomEvent.Name, this.onRoomNameChange);
    }

    public componentWillUnmount(): void {
        SpaceStore.instance.off(this.props.space.roomId, this.onSpaceUpdate);
        this.props.space.off(RoomEvent.Name, this.onRoomNameChange);
    }

    private onSpaceUpdate = (): void => {
        this.setState({
            childSpaces: this.childSpaces,
        });
    };

    private onRoomNameChange = (): void => {
        this.setState({
            name: this.props.space.name,
        });
    };

    private get childSpaces(): Room[] {
        return SpaceStore.instance
            .getChildSpaces(this.props.space.roomId)
            .filter((s) => !this.props.parents?.has(s.roomId));
    }

    public render(): React.ReactNode {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {
            space,
            activeSpaces,
            isNested,
            isPanelCollapsed,
            onExpand,
            parents,
            innerRef,
            dragHandleProps,
            ...otherProps
        } = this.props;

        const itemClasses = classNames(this.props.className, {
            mx_SpaceItem: true,
            mx_SpaceItem_narrow: isPanelCollapsed,
        });

        const isInvite = space.getMyMembership() === KnownMembership.Invite;

        const notificationState = isInvite
            ? StaticNotificationState.forSymbol("!", NotificationLevel.Highlight)
            : SpaceStore.instance.getNotificationState(space.roomId);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { tabIndex, ...restDragHandleProps } = dragHandleProps || {};
        const selected = activeSpaces.includes(space.roomId);

        return (
            <li
                {...otherProps}
                className={itemClasses}
                ref={innerRef}
                aria-selected={selected}
                role="treeitem"
            >
                <SpaceButton
                    {...restDragHandleProps}
                    space={space}
                    className={isInvite ? "mx_SpaceButton_invite" : undefined}
                    selected={selected}
                    label={this.state.name}
                    contextMenuTooltip={_t("space|context_menu|options")}
                    notificationState={notificationState}
                    isNarrow={isPanelCollapsed}
                    size={isNested ? "24px" : "32px"}
                    ContextMenuComponent={
                        this.props.space.getMyMembership() === KnownMembership.Join ? SpaceContextMenu : undefined
                    }
                />
            </li>
        );
    }
}
