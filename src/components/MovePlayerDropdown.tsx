import React, { useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../state/store';
import { movePlayerBetweenGroups } from '../state/slices/groupSlice';
import { Select } from './Select';

interface MovePlayerDropdownProps {
    groupId: string;
    playerId: string;
    onClose: () => void;
}

export const MovePlayerDropdown: React.FC<MovePlayerDropdownProps> = ({ groupId, playerId, onClose }) => {
    const groups = useAppSelector(state => state.group.groups);
    const dispatch = useAppDispatch();

    const otherGroups = useMemo(() => 
        groups.filter(g => g.id !== groupId && g.members.length < 5),
        [groups, groupId]
    );

    const handleMoveSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const targetGroupId = e.target.value;
        if (targetGroupId) {
            dispatch(movePlayerBetweenGroups({ playerId, sourceGroupId: groupId, targetGroupId }));
        }
        onClose();
    };

    return (
        <Select
            onChange={handleMoveSelect}
            onBlur={onClose}
            className="absolute right-0 top-full mt-1 z-[100] py-1.5 px-3 min-w-[120px]"
            defaultValue=""
            autoFocus
        >
            <option value="" disabled>Move to...</option>
            {otherGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </Select>
    );
};
