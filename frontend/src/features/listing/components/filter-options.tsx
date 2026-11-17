import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import type { ReactElement } from 'react';

export interface FilterOptionsProps<T extends string> {
    options: readonly T[];
    selected: T;
    labelOf: (option: T) => string;
    onPick: (option: T) => void;
}

/** A single-choice list inside a pill's popover: picking applies and closes, no extra step. */
export function FilterOptions<T extends string>({
    options,
    selected,
    labelOf,
    onPick,
}: FilterOptionsProps<T>): ReactElement {
    return (
        <MenuList dense autoFocusItem>
            {options.map((option) => (
                <MenuItem
                    key={option}
                    selected={option === selected}
                    onClick={() => {
                        onPick(option);
                    }}
                >
                    {labelOf(option)}
                </MenuItem>
            ))}
        </MenuList>
    );
}
