import React from 'react'

export const ProfileIcon = ({ active }) => {
    const fill = active ? "#007BCF" : "#5a596c"
    return (<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -64 512 512" width="20">
        <g>
            <path
                d="m453.332031 0h-394.664062c-32.363281 0-58.667969 26.304688-58.667969 58.667969v266.664062c0 32.363281 26.304688 58.667969 58.667969 58.667969h394.664062c32.363281 0 58.667969-26.304688 58.667969-58.667969v-266.664062c0-32.363281-26.304688-58.667969-58.667969-58.667969zm-293.332031 85.332031c29.398438 0 53.332031 23.9375 53.332031 53.335938 0 29.394531-23.933593 53.332031-53.332031 53.332031s-53.332031-23.9375-53.332031-53.332031c0-29.398438 23.933593-53.335938 53.332031-53.335938zm96 197.335938c0 8.832031-7.167969 16-16 16h-160c-8.832031 0-16-7.167969-16-16v-10.667969c0-32.363281 26.304688-58.667969 58.667969-58.667969h74.664062c32.363281 0 58.667969 26.304688 58.667969 58.667969zm176 16h-117.332031c-8.832031 0-16-7.167969-16-16s7.167969-16 16-16h117.332031c8.832031 0 16 7.167969 16 16s-7.167969 16-16 16zm0-85.335938h-117.332031c-8.832031 0-16-7.167969-16-16s7.167969-16 16-16h117.332031c8.832031 0 16 7.167969 16 16s-7.167969 16-16 16zm0-85.332031h-117.332031c-8.832031 0-16-7.167969-16-16s7.167969-16 16-16h117.332031c8.832031 0 16 7.167969 16 16s-7.167969 16-16 16zm0 0"
                data-original="#000000" className="active-path" data-old_color="#000000" fill={fill}/>
        </g>
    </svg>)
}
