from typing import Union
from bs4 import BeautifulSoup
from bs4.element import NavigableString


def clean_html(html: Union[str, BeautifulSoup]) -> Union[str, BeautifulSoup]:
    inp_was_soup = False
    if isinstance(html, BeautifulSoup):
        soup = html
        inp_was_soup = True
    else:
        soup = BeautifulSoup(html, "lxml")
    # remove non-content tags
    for tag in soup.select("style,svg,canvas,template,head,meta,noscript"):
        tag.decompose()

    # remove hidden elements
    for tag in soup.select("[hidden], [aria-hidden='true'], [style*='display:none'], [style*='visibility:hidden']"):
        tag.decompose()
    
    # turn <br> into newlines
    for br in soup.find_all("br"):
        br.replace_with(NavigableString("\n"))

    if inp_was_soup:
        return soup
    else:
        return soup.decode()
