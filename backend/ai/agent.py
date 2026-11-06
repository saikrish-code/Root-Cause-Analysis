from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from typing import TypedDict, List

class AgentState(TypedDict):
    messages: List[str]

def create_rca_graph(api_key: str):
    workflow = StateGraph(AgentState)
    
    def dummy_node(state: AgentState):
        return {"messages": state["messages"] + ["RCA Agent Initialized"]}
    
    workflow.add_node("rca_node", dummy_node)
    workflow.set_entry_point("rca_node")
    workflow.add_edge("rca_node", END)
    
    return workflow.compile()
