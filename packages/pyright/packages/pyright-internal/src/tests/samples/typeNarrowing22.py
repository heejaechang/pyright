# This sample tests type narrowing based on key accesses
# to unions of TypedDicts that have fields with literal types.

from typing import Literal, TypedDict, Union


class NewJobEvent(TypedDict):
    tag: Literal["new-job"]
    job_name: str
    config_file_path: str


class CancelJobEvent(TypedDict):
    tag: Literal[2]
    job_id: int


class OtherEvent(TypedDict):
    tag: Literal["other-job"]
    message: str


Event = Union[NewJobEvent, CancelJobEvent, OtherEvent]


def process_event(event: Event) -> None:
    if event["tag"] == "new-job":
        t1: Literal["NewJobEvent"] = reveal_type(event)
        event["job_name"]
    elif event["tag"] == 2:
        t2: Literal["CancelJobEvent"] = reveal_type(event)
        event["job_id"]
    else:
        t3: Literal["OtherEvent"] = reveal_type(event)
        event["message"]

